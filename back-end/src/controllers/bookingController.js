const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const payos = require('../utils/payos');

// Helper: Generate tickets for a booking
const generateTickets = async (booking) => {
    const tickets = [];
    for (const item of booking.items) {
        for (let i = 0; i < item.quantity; i++) {
            const qrCodeData = crypto.randomUUID();
            const newTicket = new Ticket({
                booking_id: booking._id,
                event_id: booking.event_id,
                user_id: booking.user_id,
                ticket_type: item.type_name,
                qr_code_data: qrCodeData,
                status: 'valid'
            });
            tickets.push(newTicket);
        }
    }
    if (tickets.length > 0) {
        await Ticket.insertMany(tickets);
    }
    return tickets;
};

// Helper: Create a notification for the user
const createNotification = async (userId, title, content, type = 'payment_success') => {
    try {
        await Notification.create({
            user_id: userId,
            title,
            content,
            type
        });
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
};

// Helper: Rollback ticket quantities on failure
const rollbackTicketQuantities = async (eventId, items) => {
    try {
        const event = await Event.findById(eventId);
        if (event) {
            for (const item of items) {
                const ticketType = event.ticket_types.find(t => t.type_name === item.type_name);
                if (ticketType) {
                    ticketType.remaining_quantity += item.quantity;
                }
            }
            await event.save();
        }
    } catch (err) {
        console.error("Failed to rollback ticket quantities:", err);
    }
};

// ==========================================
// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
// ==========================================
exports.createBooking = async (req, res) => {
    try {
        const { event_id, items, total_amount, payment_method } = req.body;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const user_id = req.user._id;

        // Validate payment method
        const validMethods = ['payos', 'cash', 'free'];
        const method = validMethods.includes(payment_method) ? payment_method : 'cash';

        // Check if event exists
        const event = await Event.findById(event_id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'published') {
            return res.status(400).json({ message: 'Event is not available for booking' });
        }

        // Check items availability and reduce quantities
        let totalTickets = 0;
        for (const item of items) {
            const ticketType = event.ticket_types.find(t => t.type_name === item.type_name);
            if (!ticketType) {
                return res.status(400).json({ message: `Ticket type "${item.type_name}" not found in event` });
            }
            if (ticketType.remaining_quantity < item.quantity) {
                return res.status(400).json({ message: `Not enough tickets for "${item.type_name}". Only ${ticketType.remaining_quantity} left.` });
            }
            ticketType.remaining_quantity -= item.quantity;
            totalTickets += item.quantity;
        }

        if (totalTickets === 0) {
            return res.status(400).json({ message: 'No tickets selected' });
        }

        // Save updated event quantities
        await event.save();

        // Determine actual payment method
        let actualMethod = method;
        if (total_amount === 0) {
            actualMethod = 'free';
        }

        // Create booking
        const bookingData = {
            user_id,
            event_id,
            items,
            total_amount,
            payment_method: actualMethod,
            payment_status: 'pending'
        };

        // ============ CASE 1: FREE EVENT ============
        if (actualMethod === 'free') {
            bookingData.payment_status = 'paid';
            const newBooking = new Booking(bookingData);
            const savedBooking = await newBooking.save();

            // Generate tickets immediately
            const tickets = await generateTickets(savedBooking);

            // Notify user
            await createNotification(
                user_id,
                'Đặt vé thành công!',
                `Bạn đã đặt ${totalTickets} vé cho sự kiện "${event.title}" (miễn phí).`
            );

            return res.status(201).json({
                booking: savedBooking,
                tickets,
                message: 'Free tickets booked successfully!'
            });
        }

        // ============ CASE 2: CASH PAYMENT ============
        if (actualMethod === 'cash') {
            const newBooking = new Booking(bookingData);
            const savedBooking = await newBooking.save();

            // For cash: booking stays as pending, organizer will confirm later
            await createNotification(
                user_id,
                'Đặt vé thành công - Chờ thanh toán',
                `Bạn đã đặt ${totalTickets} vé cho sự kiện "${event.title}". Vui lòng thanh toán tiền mặt tại quầy.`
            );

            return res.status(201).json({
                booking: savedBooking,
                message: 'Booking created. Please pay cash at the venue.'
            });
        }

        // ============ CASE 3: PAYOS ONLINE PAYMENT ============
        const orderCode = Date.now() % 9007199254740991; // Ensure within safe range
        bookingData.orderCode = orderCode;

        const newBooking = new Booking(bookingData);
        const savedBooking = await newBooking.save();

        // Create PayOS Payment Link
        const YOUR_DOMAIN = process.env.PAYOS_RETURN_URL || 'http://localhost:8081';
        const amountInt = Math.max(1, Math.floor(total_amount)); // PayOS requires min 1

        const paymentData = {
            orderCode: orderCode,
            amount: amountInt,
            description: `Vé ${event.title}`.substring(0, 25),
            cancelUrl: `${YOUR_DOMAIN}/cancel`,
            returnUrl: `${YOUR_DOMAIN}/success`,
            items: items.map(item => ({
                name: item.type_name.substring(0, 25),
                quantity: item.quantity,
                price: Math.floor(item.unit_price)
            }))
        };

        let paymentLinkResponse;
        try {
            paymentLinkResponse = await payos.createPaymentLink(paymentData);
        } catch (payOsError) {
            console.error("PayOS Error:", payOsError);
            // Rollback: restore ticket quantities and mark booking as cancelled
            await rollbackTicketQuantities(event_id, items);
            savedBooking.payment_status = 'cancelled';
            savedBooking.cancelled_reason = 'Payment gateway error: ' + (payOsError.message || 'Unknown error');
            await savedBooking.save();

            return res.status(500).json({
                message: "Không thể tạo link thanh toán. Vui lòng thử lại hoặc chọn thanh toán tiền mặt.",
                error: payOsError.message || 'Payment Gateway Error'
            });
        }

        // Save checkout URL
        savedBooking.checkout_url = paymentLinkResponse.checkoutUrl;
        await savedBooking.save();

        res.status(201).json({
            booking: savedBooking,
            checkoutUrl: paymentLinkResponse.checkoutUrl
        });

    } catch (err) {
        console.error("Booking Controller Error:", err);
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// @desc    Confirm PayOS payment
// @route   POST /api/bookings/:id/confirm-payment
// @access  Private
// ==========================================
exports.confirmPayment = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.payment_status === 'paid') {
            return res.json({ message: 'Already paid', booking });
        }

        if (booking.payment_status === 'cancelled' || booking.payment_status === 'refunded') {
            return res.status(400).json({ message: 'Booking has been cancelled/refunded' });
        }

        if (booking.payment_method === 'free') {
            // Should already be paid
            return res.json({ message: 'Free booking', booking });
        }

        if (booking.payment_method === 'payos') {
            // Verify with PayOS
            if (!booking.orderCode) {
                return res.status(400).json({ message: 'No orderCode found for this booking' });
            }

            const paymentInfo = await payos.getPaymentLinkInformation(booking.orderCode);
            if (!paymentInfo || paymentInfo.status !== 'PAID') {
                return res.status(400).json({
                    message: 'Thanh toán chưa hoàn tất. Vui lòng hoàn tất thanh toán rồi thử lại.',
                    status: paymentInfo?.status
                });
            }

            booking.payment_status = 'paid';
            booking.transaction_id = paymentInfo.transactions?.[0]?.reference || '';
            await booking.save();

        } else if (booking.payment_method === 'cash') {
            // Cash confirmation requires organizer/admin
            if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only organizer or admin can confirm cash payment' });
            }
            booking.payment_status = 'paid';
            booking.confirmed_by = req.user._id;
            booking.confirmed_at = new Date();
            await booking.save();
        }

        // Generate tickets
        const tickets = await generateTickets(booking);

        // Notify user
        const event = await Event.findById(booking.event_id);
        await createNotification(
            booking.user_id,
            'Thanh toán thành công!',
            `Vé cho sự kiện "${event?.title || 'N/A'}" đã được xác nhận. Bạn có ${tickets.length} vé.`
        );

        res.json({ message: 'Payment confirmed', booking, tickets });

    } catch (err) {
        console.error("Confirm payment error:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    PayOS Webhook handler
// @route   POST /api/bookings/webhook/payos
// @access  Public (from PayOS)
// ==========================================
exports.payosWebhook = async (req, res) => {
    try {
        console.log("PayOS Webhook received:", JSON.stringify(req.body));

        const { orderCode, code, desc } = req.body.data || req.body;

        if (!orderCode) {
            return res.status(200).json({ message: 'No orderCode' });
        }

        const booking = await Booking.findOne({ orderCode });
        if (!booking) {
            console.log("Webhook: Booking not found for orderCode:", orderCode);
            return res.status(200).json({ message: 'Booking not found' });
        }

        // Already processed
        if (booking.payment_status === 'paid') {
            return res.status(200).json({ message: 'Already processed' });
        }

        // Payment success
        if (code === '00' || desc === 'success') {
            booking.payment_status = 'paid';
            booking.transaction_id = req.body.data?.transactionId || '';
            await booking.save();

            // Generate tickets
            await generateTickets(booking);

            // Notify user
            const event = await Event.findById(booking.event_id);
            await createNotification(
                booking.user_id,
                'Thanh toán thành công!',
                `Thanh toán cho sự kiện "${event?.title || 'N/A'}" đã được xác nhận.`
            );
        }

        res.status(200).json({ message: 'Webhook processed' });

    } catch (err) {
        console.error("Webhook error:", err);
        res.status(200).json({ message: 'Error processing webhook' }); // Always return 200 to PayOS
    }
};

// ==========================================
// @desc    Get bookings for current user
// @route   GET /api/bookings
// @access  Private
// ==========================================
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ user_id: req.user._id })
            .populate('event_id', 'title date_time location banner_url')
            .sort('-createdAt');
        res.status(200).json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    Get bookings for an event (organizer)
// @route   GET /api/bookings/event/:eventId
// @access  Private (Organizer/Admin)
// ==========================================
exports.getBookingsByEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership
        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const bookings = await Booking.find({ event_id: req.params.eventId })
            .populate('user_id', 'full_name email')
            .sort('-createdAt');

        res.status(200).json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    Get all bookings (admin)
// @route   GET /api/bookings/all
// @access  Private (Admin)
// ==========================================
exports.getAllBookings = async (req, res) => {
    try {
        const { status, event_id, page = 1, limit = 20 } = req.query;
        let query = {};

        if (status) query.payment_status = status;
        if (event_id) query.event_id = event_id;

        const bookings = await Booking.find(query)
            .populate('user_id', 'full_name email')
            .populate('event_id', 'title date_time')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Booking.countDocuments(query);

        res.status(200).json({
            bookings,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    Get a single booking
// @route   GET /api/bookings/:id
// @access  Private
// ==========================================
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('event_id')
            .populate('user_id', 'full_name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check access: owner, organizer of event, or admin
        const isOwner = booking.user_id._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        let isOrganizer = false;

        if (booking.event_id && booking.event_id.organizer_id) {
            isOrganizer = booking.event_id.organizer_id.toString() === req.user._id.toString();
        }

        if (!isOwner && !isAdmin && !isOrganizer) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.status(200).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    Cancel Booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
// ==========================================
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check owner or admin
        if (booking.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.payment_status === 'refunded' || booking.payment_status === 'cancelled') {
            return res.status(400).json({ message: 'Booking already cancelled/refunded' });
        }

        // Restore event quantities
        await rollbackTicketQuantities(booking.event_id, booking.items);

        // Update booking status
        if (booking.payment_status === 'paid') {
            booking.payment_status = 'refunded';
        } else {
            booking.payment_status = 'cancelled';
        }
        booking.cancelled_reason = req.body.reason || 'User cancelled';
        await booking.save();

        // Invalidate tickets
        await Ticket.updateMany({ booking_id: booking._id }, { status: 'expired' });

        // Notify user
        const event = await Event.findById(booking.event_id);
        await createNotification(
            booking.user_id,
            'Đơn đặt vé đã hủy',
            `Đơn đặt vé cho sự kiện "${event?.title || 'N/A'}" đã được hủy.`,
            'system'
        );

        res.json({ message: 'Booking cancelled successfully', booking });

    } catch (err) {
        console.error("Cancel Booking Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// @desc    Get booking stats for an event
// @route   GET /api/bookings/stats/:eventId
// @access  Private (Organizer/Admin)
// ==========================================
exports.getBookingStats = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership
        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const stats = await Booking.aggregate([
            { $match: { event_id: new mongoose.Types.ObjectId(req.params.eventId) } },
            {
                $group: {
                    _id: '$payment_status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total_amount' }
                }
            }
        ]);

        const paymentMethodStats = await Booking.aggregate([
            {
                $match: {
                    event_id: new mongoose.Types.ObjectId(req.params.eventId),
                    payment_status: 'paid'
                }
            },
            {
                $group: {
                    _id: '$payment_method',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total_amount' }
                }
            }
        ]);

        const totalRevenue = stats
            .filter(s => s._id === 'paid')
            .reduce((sum, s) => sum + s.totalAmount, 0);

        res.json({
            event: { _id: event._id, title: event.title },
            statusStats: stats,
            paymentMethodStats,
            totalRevenue,
            totalBookings: stats.reduce((sum, s) => sum + s.count, 0)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Voucher = require('../models/Voucher');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const generateQR = require('../utils/generateQR');
const { getIO } = require('../socket');

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

const getOrCreateTickets = async (booking) => {
    const existingTickets = await Ticket.find({ booking_id: booking._id });
    if (existingTickets.length > 0) {
        return existingTickets;
    }
    return generateTickets(booking);
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

const buildEventLiveStats = async (eventId) => {
    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const bookingStats = await Booking.aggregate([
        { $match: { event_id: eventObjectId } },
        {
            $group: {
                _id: '$payment_status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$total_amount' }
            }
        }
    ]);

    const paidTicketQuantity = await Booking.aggregate([
        { $match: { event_id: eventObjectId, payment_status: 'paid' } },
        { $unwind: '$items' },
        {
            $group: {
                _id: null,
                quantity: { $sum: '$items.quantity' }
            }
        }
    ]);

    const ticketStatusStats = await Ticket.aggregate([
        { $match: { event_id: eventObjectId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const recentSales = await Booking.aggregate([
        {
            $match: {
                event_id: eventObjectId,
                payment_status: 'paid',
                createdAt: { $gte: fiveMinutesAgo },
            }
        },
        { $unwind: '$items' },
        {
            $group: {
                _id: null,
                quantity: { $sum: '$items.quantity' }
            }
        }
    ]);

    const bookingMap = new Map(bookingStats.map((item) => [item._id, item]));
    const ticketMap = new Map(ticketStatusStats.map((item) => [item._id, item.count]));

    return {
        eventId,
        totalBookings: bookingStats.reduce((sum, item) => sum + item.count, 0),
        paidBookings: bookingMap.get('paid')?.count || 0,
        pendingBookings: bookingMap.get('pending')?.count || 0,
        refundedBookings: bookingMap.get('refunded')?.count || 0,
        cancelledBookings: bookingMap.get('cancelled')?.count || 0,
        totalRevenue: bookingMap.get('paid')?.totalAmount || 0,
        ticketsSold: paidTicketQuantity[0]?.quantity || 0,
        ticketsCheckedIn: ticketMap.get('used') || 0,
        ticketsValid: ticketMap.get('valid') || 0,
        ticketsExpired: ticketMap.get('expired') || 0,
        salesPerMinute: Number(((recentSales[0]?.quantity || 0) / 5).toFixed(2)),
        updatedAt: new Date().toISOString(),
    };
};

const emitEventLiveStats = async (eventId) => {
    try {
        const io = getIO();
        const stats = await buildEventLiveStats(eventId);
        io.to(`event:${eventId}`).emit('event:stats-updated', stats);
    } catch (error) {
        console.error('Emit live stats failed:', error.message);
    }
};

const emitEventInventory = async (eventId) => {
    try {
        const io = getIO();
        const event = await Event.findById(eventId).select('ticket_types');
        if (!event) return;

        const remaining = event.ticket_types.reduce((sum, type) => sum + (type.remaining_quantity || 0), 0);
        io.to(`event:${eventId}`).emit('event:inventory-updated', {
            eventId,
            soldOut: remaining <= 0,
            remaining,
            ticketTypes: event.ticket_types,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Emit event inventory failed:', error.message);
    }
};

const emitBookingStatusUpdate = async (booking) => {
    try {
        const io = getIO();
        io.to(`user:${booking.user_id.toString()}`).emit('booking:status-updated', {
            bookingId: booking._id.toString(),
            eventId: booking.event_id.toString(),
            paymentStatus: booking.payment_status,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Emit booking status failed:', error.message);
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
        const { event_id, items, payment_method, voucher_code } = req.body;

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const user_id = req.user._id;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'No tickets selected' });
        }

        // Validate payment method
        const validMethods = ['payos', 'cash'];
        const method = validMethods.includes(payment_method) ? payment_method : 'payos';

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
        let calculatedTotal = 0;
        for (const item of items) {
            if (!item || !item.type_name || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({ message: 'Invalid ticket item' });
            }

            const ticketType = event.ticket_types.find(t => t.type_name === item.type_name);
            if (!ticketType) {
                return res.status(400).json({ message: `Ticket type "${item.type_name}" not found in event` });
            }
            if (ticketType.remaining_quantity < item.quantity) {
                return res.status(400).json({ message: `Not enough tickets for "${item.type_name}". Only ${ticketType.remaining_quantity} left.` });
            }
            ticketType.remaining_quantity -= item.quantity;
            totalTickets += item.quantity;
            calculatedTotal += Number(item.unit_price || 0) * item.quantity;
        }

        if (totalTickets === 0) {
            return res.status(400).json({ message: 'No tickets selected' });
        }

        let appliedVoucherCode = null;
        let appliedDiscountType = null;
        let appliedDiscountValue = 0;
        let discountAmount = 0;

        if (voucher_code && String(voucher_code).trim()) {
            const normalizedCode = String(voucher_code).trim().toUpperCase();
            const voucher = await Voucher.findOne({ code: normalizedCode });

            if (!voucher) {
                return res.status(400).json({ message: 'Invalid voucher code' });
            }

            if (new Date() > voucher.expiry_date) {
                return res.status(400).json({ message: 'Voucher expired' });
            }

            if (voucher.event_id && voucher.event_id.toString() !== event_id.toString()) {
                return res.status(400).json({ message: 'Voucher not applicable for this event' });
            }

            if (calculatedTotal < voucher.min_order_value) {
                return res.status(400).json({ message: `Minimum order value for this voucher is ${voucher.min_order_value}` });
            }

            if (voucher.discount_type === 'percentage') {
                discountAmount = (calculatedTotal * Number(voucher.discount_value || 0)) / 100;
            } else {
                discountAmount = Number(voucher.discount_value || 0);
            }

            discountAmount = Math.max(0, Math.min(calculatedTotal, Math.round(discountAmount)));
            appliedVoucherCode = voucher.code;
            appliedDiscountType = voucher.discount_type;
            appliedDiscountValue = Number(voucher.discount_value || 0);
        }

        // Save updated event quantities
        await event.save();
        await emitEventInventory(event._id.toString());

        const totalAmount = Math.max(0, calculatedTotal - discountAmount);
        const isZeroAmount = totalAmount === 0 || calculatedTotal === 0;

        // Create booking
        const bookingData = {
            user_id,
            event_id,
            items,
            subtotal_amount: calculatedTotal,
            voucher_code: appliedVoucherCode,
            discount_type: appliedDiscountType,
            discount_value: appliedDiscountValue,
            discount_amount: discountAmount,
            total_amount: totalAmount,
            payment_method: method,
            payment_status: isZeroAmount ? 'paid' : 'pending'
        };

        // ============ CASE 1: ZERO-AMOUNT BOOKING ============
        if (isZeroAmount) {
            const newBooking = new Booking(bookingData);
            const savedBooking = await newBooking.save();

            // Generate tickets immediately
            const tickets = await getOrCreateTickets(savedBooking);

            // Notify user
            await createNotification(
                user_id,
                'Đặt vé thành công!',
                `Bạn đã đặt ${totalTickets} vé cho sự kiện "${event.title}".`
            );

            await emitEventLiveStats(savedBooking.event_id.toString());

            return res.status(201).json({
                booking: savedBooking,
                tickets,
                message: 'Booking completed successfully.'
            });
        }

        // ============ CASE 2: CASH PAYMENT ============
        if (method === 'cash') {
            const newBooking = new Booking(bookingData);
            const savedBooking = await newBooking.save();

            // For cash: booking stays as pending, organizer will confirm later
            await createNotification(
                user_id,
                'Đặt vé thành công - Chờ thanh toán',
                `Bạn đã đặt ${totalTickets} vé cho sự kiện "${event.title}". Vui lòng thanh toán tiền mặt tại quầy.`
            );

            await emitEventLiveStats(savedBooking.event_id.toString());

            return res.status(201).json({
                booking: savedBooking,
                message: 'Booking created. Please pay cash at the venue.'
            });
        }

        // ============ CASE 3: ONLINE PAYMENT (FAKE QR FLOW) ============
        const orderCode = Date.now() % 9007199254740991;
        bookingData.orderCode = orderCode;

        const newBooking = new Booking(bookingData);
        const savedBooking = await newBooking.save();

        const qrPayload = JSON.stringify({
            bookingId: savedBooking._id.toString(),
            orderCode,
            amount: savedBooking.total_amount,
            eventTitle: event.title
        });
        const qrDataUrl = await generateQR(qrPayload);

        // Keep checkout_url for backward compatibility with current frontend
        savedBooking.checkout_url = `fakepay://booking/${savedBooking._id}`;
        savedBooking.checkout_qr_data = qrDataUrl || '';
        await savedBooking.save();

        res.status(201).json({
            booking: savedBooking,
            checkoutUrl: savedBooking.checkout_url,
            checkoutQrData: savedBooking.checkout_qr_data,
            message: 'Booking created. Scan QR and tap confirm payment when done.'
        });

        await emitEventLiveStats(savedBooking.event_id.toString());

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

        const isOwner = booking.user_id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isOrganizer = req.user.role === 'organizer';

        if (booking.payment_status === 'paid') {
            const tickets = await Ticket.find({ booking_id: booking._id });
            return res.json({ message: 'Already paid', booking, tickets });
        }

        if (booking.payment_status === 'cancelled' || booking.payment_status === 'refunded') {
            return res.status(400).json({ message: 'Booking has been cancelled/refunded' });
        }

        if (booking.payment_method === 'payos') {
            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: 'Not authorized to confirm this payment' });
            }
            booking.payment_status = 'paid';
            booking.transaction_id = booking.transaction_id || `FAKE-${Date.now()}`;
            await booking.save();
            await emitBookingStatusUpdate(booking);

        } else if (booking.payment_method === 'cash') {
            // Cash confirmation requires organizer/admin
            if (!isOrganizer && !isAdmin) {
                return res.status(403).json({ message: 'Only organizer or admin can confirm cash payment' });
            }
            booking.payment_status = 'paid';
            booking.confirmed_by = req.user._id;
            booking.confirmed_at = new Date();
            await booking.save();
            await emitBookingStatusUpdate(booking);
        }

        // Generate tickets
        const tickets = await getOrCreateTickets(booking);

        // Notify user
        const event = await Event.findById(booking.event_id);
        await createNotification(
            booking.user_id,
            'Thanh toán thành công!',
            `Vé cho sự kiện "${event?.title || 'N/A'}" đã được xác nhận. Bạn có ${tickets.length} vé.`
        );

        await emitEventLiveStats(booking.event_id.toString());

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

        // Keep this endpoint for backward compatibility; in fake flow we trust success callbacks.
        if (code === '00' || desc === 'success') {
            booking.payment_status = 'paid';
            booking.transaction_id = req.body.data?.transactionId || '';
            await booking.save();
            await emitBookingStatusUpdate(booking);

            // Generate tickets
            await getOrCreateTickets(booking);

            // Notify user
            const event = await Event.findById(booking.event_id);
            await createNotification(
                booking.user_id,
                'Thanh toán thành công!',
                `Thanh toán cho sự kiện "${event?.title || 'N/A'}" đã được xác nhận.`
            );

            await emitEventLiveStats(booking.event_id.toString());
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

        await emitEventInventory(booking.event_id.toString());

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

        await emitEventLiveStats(booking.event_id.toString());

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

// ==========================================
// @desc    Get live stats for an event
// @route   GET /api/bookings/live-stats/:eventId
// @access  Private (Organizer/Admin)
// ==========================================
exports.getEventLiveStats = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const stats = await buildEventLiveStats(req.params.eventId);
        return res.json({
            event: { _id: event._id, title: event.title },
            ...stats,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

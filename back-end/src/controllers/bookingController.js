const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const crypto = require('crypto');
const payos = require('../utils/payos');

// Create a new booking
exports.createBooking = async (req, res) => {
    try {
        console.log("Create Booking Request Body:", req.body);
        const { event_id, items, total_amount, payment_method } = req.body;

        if (!req.user || !req.user._id) {
            console.error("User not authenticated in request");
            return res.status(401).json({ message: "User not authenticated" });
        }
        const user_id = req.user._id;

        // Check if event exists
        const event = await Event.findById(event_id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check items availability and calculate total tickets needed
        let totalTickets = 0;

        for (const item of items) {
            const ticketType = event.ticket_types.find(t => t.type_name === item.type_name);
            if (!ticketType) {
                return res.status(400).json({ message: `Ticket type ${item.type_name} not found in event` });
            }
            if (ticketType.remaining_quantity < item.quantity) {
                return res.status(400).json({ message: `Not enough tickets for ${item.type_name}` });
            }

            // key step: Decrement remaining quantity
            ticketType.remaining_quantity -= item.quantity;
            totalTickets += item.quantity;
        }

        // Save the updated event
        await event.save();

        // Create Booking
        const orderCode = Date.now(); // Use timestamp as unique order code for simplicity
        // Ensure orderCode is within safe integer range (though Date.now is safe)
        // PayOS requires orderCode 0-9007199254740991.

        const newBooking = new Booking({
            user_id,
            event_id,
            items,
            total_amount,
            payment_method,
            payment_status: 'pending',
            orderCode
        });

        const savedBooking = await newBooking.save();

        // Create PayOS Payment Link
        const YOUR_DOMAIN = 'http://localhost:8081'; // Update with your actual frontend URL or deep link scheme
        // Ensure amount is integer
        const amountInt = Math.floor(total_amount);

        const paymentData = {
            orderCode: orderCode,
            amount: amountInt,
            description: `Order ${orderCode}`.substring(0, 25), // Ensure description is short and valid
            cancelUrl: `${YOUR_DOMAIN}/cancel`,
            returnUrl: `${YOUR_DOMAIN}/success`
        };

        console.log("Creating PayOS Link with data:", paymentData);
        let paymentLinkResponse;
        try {
            paymentLinkResponse = await payos.createPaymentLink(paymentData);
            console.log("PayOS Response:", paymentLinkResponse);
        } catch (payOsError) {
            console.error("PayOS Error:", payOsError);
            // If PayOS fails, we might want to delete the booking or keep it as pending/failed
            // For now, return error
            return res.status(500).json({ message: "Payment Gateway Error: " + (payOsError.message || JSON.stringify(payOsError)) });
        }

        res.status(201).json({
            booking: savedBooking,
            checkoutUrl: paymentLinkResponse.checkoutUrl
        });

    } catch (err) {
        console.error("Booking Controller Error:", err);
        res.status(500).json({ message: err.message, error: err.message });
    }
};

// Get bookings for current user
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

// Get a single booking
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('event_id')
            .populate('user_id', 'full_name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check access
        if (booking.user_id._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.status(200).json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Cancel Booking (Refund logic would be here, for now just status change)
exports.cancelBooking = async (req, res) => {
    // Transaction needed to restore ticket quantities
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check owner
        if (booking.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (booking.payment_status === 'refunded') {
            return res.status(400).json({ message: 'Booking already refunded' });
        }

        // Restore event quantities
        const event = await Event.findById(booking.event_id);
        if (event) {
            for (const item of booking.items) {
                const ticketType = event.ticket_types.find(t => t.type_name === item.type_name);
                if (ticketType) {
                    ticketType.remaining_quantity += item.quantity;
                }
            }
            await event.save();
        }

        // Update booking status
        booking.payment_status = 'refunded';
        await booking.save();

        // Invalidate tickets
        await Ticket.updateMany({ booking_id: booking._id }, { status: 'expired' });

        res.json({ message: 'Booking cancelled and refunded' });

    } catch (err) {
        console.error("Cancel Booking Error:", err);
        res.status(500).json({ error: err.message });
    }
}

// Confirm Payment (Called by frontend after payment or by webhook)
exports.confirmPayment = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.payment_status === 'paid') {
            // Already paid, just return success
            return res.json({ message: 'Already paid', booking });
        }

        // Verify with PayOS
        const paymentInfo = await payos.getPaymentLinkInformation(booking.orderCode);
        if (!paymentInfo || paymentInfo.status !== 'PAID') {
            return res.status(400).json({ message: 'Payment not completed or failed', status: paymentInfo?.status });
        }

        // Update status
        booking.payment_status = 'paid';
        booking.transaction_id = paymentInfo.transactions?.[0]?.reference || '';
        await booking.save();

        // Generate Tickets
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

        await Ticket.insertMany(tickets);

        res.json({ message: 'Payment confirmed', booking, tickets });

    } catch (err) {
        console.error("Confirm payment error:", err);
        res.status(500).json({ error: err.message });
    }
};


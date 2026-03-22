const Ticket = require('../models/Ticket');
const { getIO } = require('../socket');

// @desc    Get my tickets
// @route   GET /api/tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ user_id: req.user._id })
            .populate('event_id', 'title date_time location banner_url')
            .sort('-createdAt');
        res.json(tickets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate('event_id');
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Authorization
        if (ticket.user_id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'organizer') {
            // Organizer might need to scan it, but usually scan is via qr_code_data
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(ticket);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate Ticket (Scan QR)
// @route   POST /api/tickets/validate
// @access  Private (Organizer/Admin)
exports.validateTicket = async (req, res) => {
    try {
        const { qr_code_data, gate_id } = req.body; // Scanner sends the unique string

        if (!qr_code_data || !String(qr_code_data).trim()) {
            return res.status(400).json({
                valid: false,
                code: 'INVALID_QR',
                message: 'Invalid ticket code'
            });
        }

        const normalizedCode = String(qr_code_data).trim();
        const ticket = await Ticket.findOne({ qr_code_data: normalizedCode }).populate('event_id');

        if (!ticket) {
            return res.status(404).json({
                valid: false,
                code: 'INVALID_QR',
                message: 'Invalid ticket code'
            });
        }

        // Check if event belongs to organizer (if not admin)
        if (req.user.role !== 'admin' && ticket.event_id.organizer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ valid: false, code: 'FORBIDDEN', message: 'Not authorized for this event' });
        }

        if (ticket.status === 'used') {
            const now = Date.now();
            const checkedAt = ticket.check_in_at ? new Date(ticket.check_in_at).getTime() : 0;
            const secondsSinceCheckIn = checkedAt > 0 ? (now - checkedAt) / 1000 : null;
            const isPotentialFraud = Boolean(
                gate_id &&
                ticket.check_in_gate &&
                ticket.check_in_gate !== gate_id &&
                secondsSinceCheckIn !== null &&
                secondsSinceCheckIn <= 5
            );

            if (isPotentialFraud) {
                try {
                    const io = getIO();
                    io.to(`organizer:${ticket.event_id.organizer_id.toString()}`).emit('fraud:alert', {
                        type: 'duplicate-qr-scan',
                        ticketId: ticket._id.toString(),
                        qrCodeData: ticket.qr_code_data,
                        eventId: ticket.event_id?._id?.toString() || '',
                        scannedGate: gate_id,
                        originalGate: ticket.check_in_gate,
                        firstCheckInAt: ticket.check_in_at,
                        triggeredAt: new Date().toISOString(),
                    });
                } catch (socketError) {
                    console.error('Fraud alert emit failed:', socketError.message);
                }

                return res.status(409).json({
                    valid: false,
                    code: 'FRAUD_SUSPECT',
                    message: `Ticket was already checked in ${Math.max(0, Math.round(secondsSinceCheckIn || 0))}s ago at ${ticket.check_in_gate}.`,
                    check_in_at: ticket.check_in_at,
                });
            }

            return res.status(409).json({
                valid: false,
                code: 'ALREADY_CHECKED_IN',
                message: 'Ticket already checked in',
                check_in_at: ticket.check_in_at,
                ticket: {
                    id: ticket._id,
                    type: ticket.ticket_type,
                    event: ticket.event_id?.title || '',
                    status: ticket.status
                }
            });
        }

        if (ticket.status === 'expired') {
            return res.status(400).json({ valid: false, code: 'TICKET_EXPIRED', message: 'Ticket expired' });
        }

        // Update status to used
        ticket.status = 'used';
        ticket.check_in_at = new Date();
        ticket.check_in_gate = gate_id || 'unknown';
        await ticket.save();

        try {
            const io = getIO();
            io.to(`user:${ticket.user_id.toString()}`).emit('ticket:checked-in', {
                userId: ticket.user_id.toString(),
                ticketId: ticket._id.toString(),
                eventId: ticket.event_id?._id?.toString() || '',
                status: ticket.status,
                checkInAt: ticket.check_in_at,
            });

            io.to(`event:${ticket.event_id?._id?.toString() || ticket.event_id.toString()}`).emit('event:stats-refresh', {
                eventId: ticket.event_id?._id?.toString() || ticket.event_id.toString(),
                reason: 'ticket-checked-in',
            });
        } catch (socketError) {
            console.error('Socket emit failed:', socketError.message);
        }

        res.json({
            valid: true,
            code: 'CHECKED_IN',
            message: 'Check-in successful',
            ticket: {
                id: ticket._id,
                user: ticket.user_id, // Could populate if needed
                type: ticket.ticket_type,
                event: ticket.event_id.title,
                status: ticket.status,
                check_in_at: ticket.check_in_at
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

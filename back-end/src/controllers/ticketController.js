const Ticket = require('../models/Ticket');

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
        const { qr_code_data } = req.body; // Scanner sends the unique string

        const ticket = await Ticket.findOne({ qr_code_data }).populate('event_id');

        if (!ticket) {
            return res.status(404).json({ valid: false, message: 'Invalid Ticket' });
        }

        // Check if event belongs to organizer (if not admin)
        if (req.user.role !== 'admin' && ticket.event_id.organizer_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ valid: false, message: 'Not authorized for this event' });
        }

        if (ticket.status === 'used') {
            return res.status(400).json({ valid: false, message: 'Ticket already used', check_in_at: ticket.check_in_at });
        }

        if (ticket.status === 'expired') {
            return res.status(400).json({ valid: false, message: 'Ticket expired' });
        }

        // Update status to used
        ticket.status = 'used';
        ticket.check_in_at = new Date();
        await ticket.save();

        res.json({
            valid: true,
            message: 'Check-in successful',
            ticket: {
                id: ticket._id,
                user: ticket.user_id, // Could populate if needed
                type: ticket.ticket_type,
                event: ticket.event_id.title
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const Voucher = require('../models/Voucher');

// @desc    Get all vouchers (Organizer/Admin)
// @route   GET /api/vouchers
// @access  Private
exports.getVouchers = async (req, res) => {
    try {
        let query = {};
        // Organizers only see their event vouchers or global if admin?
        // For simplicity, let's say organizers see vouchers for their events + global
        // But here we'll just return all for now or filter by event_id query param

        if (req.query.event_id) {
            query.event_id = req.query.event_id;
        }

        const vouchers = await Voucher.find(query).populate('event_id', 'title');
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a voucher
// @route   POST /api/vouchers
// @access  Private (Organizer/Admin)
exports.createVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.create(req.body);
        res.status(201).json(voucher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a voucher
// @route   PUT /api/vouchers/:id
// @access  Private (Organizer/Admin)
exports.updateVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
        res.json(voucher);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a voucher
// @route   DELETE /api/vouchers/:id
// @access  Private (Organizer/Admin)
exports.deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByIdAndDelete(req.params.id);
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
        res.json({ message: 'Voucher removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate a voucher code
// @route   POST /api/vouchers/validate
// @access  Public
exports.validateVoucher = async (req, res) => {
    try {
        const { code, event_id, order_value } = req.body;
        const voucher = await Voucher.findOne({ code });

        if (!voucher) {
            return res.status(404).json({ message: 'Invalid voucher code' });
        }

        // Check expiry
        if (new Date() > voucher.expiry_date) {
            return res.status(400).json({ message: 'Voucher expired' });
        }

        // Check event applicability (if not global)
        if (voucher.event_id && voucher.event_id.toString() !== event_id) {
            return res.status(400).json({ message: 'Voucher not applicable for this event' });
        }

        // Check min order value
        if (order_value < voucher.min_order_value) {
            return res.status(400).json({ message: `Minimum order value for this voucher is ${voucher.min_order_value}` });
        }

        res.json({
            valid: true,
            code: voucher.code,
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value,
            min_order_value: voucher.min_order_value,
            event_id: voucher.event_id || null,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const Voucher = require('../models/Voucher');
const Event = require('../models/Event');

const resolveVoucherOwnerId = async (voucher) => {
    if (!voucher) return null;
    return voucher.organizer_id || null;
};

// @desc    Get all vouchers (Organizer/Admin)
// @route   GET /api/vouchers
// @access  Private
exports.getVouchers = async (req, res) => {
    try {
        let query = {};

        if (req.user.role !== 'admin') {
            query.organizer_id = req.user._id;
        } else if (req.query.organizer_id) {
            query.organizer_id = req.query.organizer_id;
        }

        const vouchers = await Voucher.find(query)
            .populate('organizer_id', 'full_name email');
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
        const payload = {
            ...req.body,
            organizer_id: req.user._id,
            code: String(req.body?.code || '').trim().toUpperCase(),
        };
        delete payload.event_id;

        const voucher = await Voucher.create(payload);
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
        const existing = await Voucher.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Voucher not found' });

        const ownerId = await resolveVoucherOwnerId(existing);
        if (req.user.role !== 'admin' && String(ownerId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to update this voucher' });
        }

        const payload = {
            ...req.body,
            organizer_id: ownerId || req.user._id,
        };
        delete payload.event_id;
        if (payload.code) {
            payload.code = String(payload.code).trim().toUpperCase();
        }

        const voucher = await Voucher.findByIdAndUpdate(req.params.id, payload, { new: true });
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
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

        const ownerId = await resolveVoucherOwnerId(voucher);
        if (req.user.role !== 'admin' && String(ownerId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized to delete this voucher' });
        }

        await voucher.deleteOne();
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
        const { code, event_id } = req.body;
        const normalizedCode = String(code || '').trim().toUpperCase();
        const voucher = await Voucher.findOne({ code: normalizedCode });

        if (!voucher) {
            return res.status(404).json({ message: 'Invalid voucher code' });
        }

        if (!event_id) {
            return res.status(400).json({ message: 'event_id is required' });
        }

        const event = await Event.findById(event_id).select('_id organizer_id');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check expiry
        if (new Date() > voucher.expiry_date) {
            return res.status(400).json({ message: 'Voucher expired' });
        }

        const voucherOwnerId = await resolveVoucherOwnerId(voucher);

        if (!voucherOwnerId || String(voucherOwnerId) !== String(event.organizer_id)) {
            return res.status(400).json({ message: 'Voucher is not available for this event' });
        }

        res.json({
            valid: true,
            code: voucher.code,
            discount_type: voucher.discount_type,
            discount_value: voucher.discount_value,
            min_order_value: voucher.min_order_value || 0,
            organizer_id: voucherOwnerId,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

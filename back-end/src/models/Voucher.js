const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    organizer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discount_value: {
        type: Number,
        required: true
    },
    min_order_value: {
        type: Number,
        default: 0
    },
    expiry_date: {
        type: Date,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);

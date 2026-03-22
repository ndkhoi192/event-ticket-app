const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    items: [{
        type_name: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        unit_price: {
            type: Number,
            required: true
        }
    }],
    subtotal_amount: {
        type: Number,
        default: 0
    },
    voucher_code: {
        type: String
    },
    discount_type: {
        type: String,
        enum: ['percentage', 'fixed']
    },
    discount_value: {
        type: Number,
        default: 0
    },
    discount_amount: {
        type: Number,
        default: 0
    },
    total_amount: {
        type: Number,
        required: true
    },
    payment_method: {
        type: String,
        enum: ['payos', 'cash'],
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'cancelled'],
        default: 'pending'
    },
    transaction_id: {
        type: String
    },
    orderCode: {
        type: Number
        // Not required anymore - only used for PayOS payments
    },
    checkout_url: {
        type: String
        // Store PayOS checkout URL for reference
    },
    checkout_qr_data: {
        type: String
        // Fake payment QR image (base64) for frontend demo flow
    },
    confirmed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // For cash payments - the organizer/admin who confirmed
    },
    confirmed_at: {
        type: Date
    },
    cancelled_reason: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

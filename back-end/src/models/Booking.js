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
    total_amount: {
        type: Number,
        required: true
    },
    payment_method: {
        type: String,
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'pending'
    },
    transaction_id: {
        type: String
    },
    orderCode: {
        type: Number,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

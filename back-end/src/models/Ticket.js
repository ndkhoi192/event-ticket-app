const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ticket_type: {
        type: String,
        required: true
    },
    qr_code_data: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['valid', 'used', 'expired'],
        default: 'valid'
    },
    check_in_at: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);

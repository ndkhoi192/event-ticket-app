const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    organizer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    banner_url: {
        type: String,
        default: ''
    },
    date_time: {
        type: Date,
        required: true
    },
    location: {
        name: {
            type: String,
            required: true
        },
        coordinates: {
            lat: {
                type: Number,
                required: true
            },
            lng: {
                type: Number,
                required: true
            }
        }
    },
    ticket_types: [{
        type_name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        total_quantity: {
            type: Number,
            required: true
        },
        remaining_quantity: {
            type: Number,
            required: true
        }
    }],
    add_ons: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    status: {
        type: String,
        enum: ['published', 'cancelled', 'ended'],
        default: 'published'
    }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);

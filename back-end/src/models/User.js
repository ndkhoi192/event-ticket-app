const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['attendee', 'organizer', 'admin'],
    default: 'attendee'
  },
  avatar_url: {
    type: String,
    default: ''
  },
  push_tokens: [{
    type: String
  }],
  saved_events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  is_deleted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
    confirmPayment,
    payosWebhook,
    getBookingsByEvent,
    getAllBookings,
    getBookingStats
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// PayOS webhook (no auth required - called by PayOS server)
router.post('/webhook/payos', payosWebhook);

// Protected routes
router.use(protect);

// User routes
router.route('/')
    .post(createBooking)
    .get(getMyBookings);

// Admin: get all bookings
router.get('/all', authorize('admin'), getAllBookings);

// Organizer/Admin: get bookings for a specific event
router.get('/event/:eventId', authorize('organizer', 'admin'), getBookingsByEvent);

// Organizer/Admin: get stats for a specific event
router.get('/stats/:eventId', authorize('organizer', 'admin'), getBookingStats);

// Single booking
router.route('/:id')
    .get(getBookingById);

// Cancel booking
router.put('/:id/cancel', cancelBooking);

// Confirm payment (PayOS verify or Cash confirm by organizer)
router.post('/:id/confirm-payment', confirmPayment);

// Keep old route for backward compatibility
router.post('/:id/confirm', confirmPayment);

module.exports = router;

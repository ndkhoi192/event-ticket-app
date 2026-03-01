const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getBookingById, cancelBooking, confirmPayment } = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect); // All routes require auth

router.route('/')
    .post(createBooking)
    .get(getMyBookings);

router.route('/:id')
    .get(getBookingById)
    .put(cancelBooking); // Using PUT for cancellation (status update)

router.route('/:id/confirm')
    .post(confirmPayment);

module.exports = router;

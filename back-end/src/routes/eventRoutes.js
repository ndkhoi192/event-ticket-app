const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent, getMyEvents } = require('../controllers/eventController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');

router.route('/')
    .get(getAllEvents)
    .post(protect, authorize('organizer', 'admin'), upload.single('banner'), createEvent);

router.get('/my-events', protect, authorize('organizer'), getMyEvents);

router.route('/:id')
    .get(getEventById)
    .put(protect, authorize('organizer', 'admin'), updateEvent)
    .delete(protect, authorize('organizer', 'admin'), deleteEvent);

module.exports = router;

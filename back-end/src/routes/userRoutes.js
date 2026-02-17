const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, getMe, saveEvent, unsaveEvent, getSavedEvents } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/me', protect, getMe);
router.get('/me/saved-events', protect, getSavedEvents);
router.post('/me/saved-events/:eventId', protect, saveEvent);
router.delete('/me/saved-events/:eventId', protect, unsaveEvent);
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);

module.exports = router;

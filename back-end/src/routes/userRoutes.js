const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, getMe } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/me', protect, getMe);
router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);

module.exports = router;

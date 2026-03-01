const express = require('express');
const router = express.Router();
const { getReviewsByEvent, createReview } = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/:eventId', getReviewsByEvent);
router.post('/', protect, createReview);

module.exports = router;

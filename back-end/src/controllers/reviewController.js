const Review = require('../models/Review');
const Event = require('../models/Event');

// @desc    Get reviews for an event
// @route   GET /api/reviews/:eventId
// @access  Public
exports.getReviewsByEvent = async (req, res) => {
    try {
        const reviews = await Review.find({ event_id: req.params.eventId })
            .populate('user_id', 'full_name avatar_url');
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
exports.createReview = async (req, res) => {
    try {
        const { event_id, rating, comment } = req.body;

        // Check if event exists
        const event = await Event.findById(event_id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user already reviewed? 
        // Usually only allow review if attended?
        // For simplicity, allow review if user exists.

        const review = await Review.create({
            event_id,
            user_id: req.user._id,
            rating,
            comment
        });

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

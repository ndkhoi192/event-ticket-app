const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    joinEventQueue,
    getMyQueueStatus,
    leaveEventQueue,
} = require('../controllers/queueController');

router.use(protect);

router.post('/join/:eventId', joinEventQueue);
router.get('/status/:eventId', getMyQueueStatus);
router.post('/leave/:eventId', leaveEventQueue);

module.exports = router;

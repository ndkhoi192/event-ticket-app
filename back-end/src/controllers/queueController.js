const Event = require('../models/Event');
const { getIO } = require('../socket');
const {
    getStatus,
    joinQueue,
    leaveQueue,
    popNextUser,
    getAllUserIds,
    setTimer,
    getTimer,
} = require('../services/virtualQueueService');

const broadcastQueueStatus = (eventId) => {
    const io = getIO();
    const userIds = getAllUserIds(eventId);

    userIds.forEach((userId) => {
        const status = getStatus(eventId, userId);
        io.to(`user:${userId}`).emit('queue:status', {
            eventId,
            ...status,
            updatedAt: new Date().toISOString(),
        });
    });
};

const ensureQueueTicker = (eventId) => {
    const existingTimer = getTimer(eventId);
    if (existingTimer) return;

    const timer = setInterval(() => {
        const nextUserId = popNextUser(eventId);
        if (!nextUserId) {
            clearInterval(timer);
            setTimer(eventId, null);
            return;
        }

        try {
            const io = getIO();
            io.to(`user:${nextUserId}`).emit('queue:ready', {
                eventId,
                message: 'It is your turn to proceed with booking.',
                updatedAt: new Date().toISOString(),
            });
            broadcastQueueStatus(eventId);
        } catch (error) {
            // Ignore transient socket issues
        }
    }, 20000);

    setTimer(eventId, timer);
};

exports.joinEventQueue = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId).select('_id status');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const userId = req.user._id.toString();
        const status = joinQueue(eventId, userId);
        ensureQueueTicker(eventId);
        broadcastQueueStatus(eventId);

        return res.json({
            eventId,
            ...status,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getMyQueueStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id.toString();
        const status = getStatus(eventId, userId);

        return res.json({
            eventId,
            ...status,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.leaveEventQueue = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id.toString();
        const status = leaveQueue(eventId, userId);
        broadcastQueueStatus(eventId);

        return res.json({
            eventId,
            ...status,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const queues = new Map();

const ensureQueue = (eventId) => {
    if (!queues.has(eventId)) {
        queues.set(eventId, {
            users: [],
            timer: null,
            avgSecondsPerUser: 20,
        });
    }

    return queues.get(eventId);
};

const getStatus = (eventId, userId) => {
    const queue = ensureQueue(eventId);
    const index = queue.users.findIndex((u) => u.userId === userId);

    if (index === -1) {
        return {
            inQueue: false,
            position: null,
            estimatedWaitSeconds: 0,
            totalInQueue: queue.users.length,
        };
    }

    const position = index + 1;
    return {
        inQueue: true,
        position,
        estimatedWaitSeconds: (position - 1) * queue.avgSecondsPerUser,
        totalInQueue: queue.users.length,
    };
};

const joinQueue = (eventId, userId) => {
    const queue = ensureQueue(eventId);

    const existing = queue.users.find((u) => u.userId === userId);
    if (existing) {
        return getStatus(eventId, userId);
    }

    queue.users.push({ userId, joinedAt: new Date() });
    return getStatus(eventId, userId);
};

const leaveQueue = (eventId, userId) => {
    const queue = ensureQueue(eventId);
    queue.users = queue.users.filter((u) => u.userId !== userId);
    return getStatus(eventId, userId);
};

const popNextUser = (eventId) => {
    const queue = ensureQueue(eventId);
    if (queue.users.length === 0) return null;
    const first = queue.users.shift();
    return first?.userId || null;
};

const getAllUserIds = (eventId) => {
    const queue = ensureQueue(eventId);
    return queue.users.map((u) => u.userId);
};

const setTimer = (eventId, timer) => {
    const queue = ensureQueue(eventId);
    queue.timer = timer;
};

const getTimer = (eventId) => {
    const queue = ensureQueue(eventId);
    return queue.timer;
};

module.exports = {
    ensureQueue,
    getStatus,
    joinQueue,
    leaveQueue,
    popNextUser,
    getAllUserIds,
    setTimer,
    getTimer,
};

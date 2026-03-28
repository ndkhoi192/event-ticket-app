const Event = require('../models/Event');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const parseIntervalMs = () => {
    const parsed = Number(process.env.EVENT_END_CHECK_INTERVAL_MS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
};

const emitAutoEndedUpdate = () => {
    try {
        const { getIO } = require('../socket');
        const io = getIO();

        io.emit('events:public-updated', {
            action: 'auto-ended',
            status: 'ended',
            updatedAt: new Date().toISOString(),
        });
    } catch (_error) {
    }
};

const runAutoEndEvents = async () => {
    const now = new Date();

    const result = await Event.updateMany(
        {
            status: 'published',
            date_time: { $lte: now },
        },
        {
            $set: { status: 'ended' },
        }
    );

    const modifiedCount = result?.modifiedCount || 0;
    if (modifiedCount > 0) {
        console.log(`[AutoEndEvents] Marked ${modifiedCount} event(s) as ended.`);
        emitAutoEndedUpdate();
    }

    return modifiedCount;
};

const startEventStatusScheduler = () => {
    const intervalMs = parseIntervalMs();

    runAutoEndEvents().catch((error) => {
        console.error('[AutoEndEvents] First run failed:', error.message);
    });

    const timer = setInterval(() => {
        runAutoEndEvents().catch((error) => {
            console.error('[AutoEndEvents] Scheduled run failed:', error.message);
        });
    }, intervalMs);

    if (typeof timer.unref === 'function') {
        timer.unref();
    }

    console.log(`[AutoEndEvents] Scheduler started. Interval: ${intervalMs}ms.`);
    return timer;
};

module.exports = {
    runAutoEndEvents,
    startEventStatusScheduler,
};

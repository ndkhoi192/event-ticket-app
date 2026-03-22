const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Event = require('./models/Event');

let ioInstance = null;

const initSocket = (httpServer) => {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    ioInstance.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('Unauthorized: missing token'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('_id role');
            if (!user) {
                return next(new Error('Unauthorized: user not found'));
            }

            socket.data.user = {
                _id: user._id.toString(),
                role: user.role,
            };

            next();
        } catch (error) {
            next(new Error('Unauthorized: invalid token'));
        }
    });

    ioInstance.on('connection', (socket) => {
        const userId = socket.data.user?._id;
        const userRole = socket.data.user?.role;

        if (userId) {
            socket.join(`user:${userId}`);

            if (userRole === 'organizer' || userRole === 'admin') {
                socket.join(`organizer:${userId}`);
            }
        }

        socket.on('attendee:join-event', async (payload, ack) => {
            try {
                const eventId = payload?.eventId;
                if (!eventId) {
                    ack?.({ ok: false, message: 'Missing eventId' });
                    return;
                }

                const event = await Event.findById(eventId).select('_id');
                if (!event) {
                    ack?.({ ok: false, message: 'Event not found' });
                    return;
                }

                socket.join(`event:${eventId}`);
                ack?.({ ok: true });
            } catch (error) {
                ack?.({ ok: false, message: 'Join room failed' });
            }
        });

        socket.on('organizer:join-event', async (payload, ack) => {
            try {
                const eventId = payload?.eventId;
                if (!eventId) {
                    ack?.({ ok: false, message: 'Missing eventId' });
                    return;
                }

                if (userRole !== 'organizer' && userRole !== 'admin') {
                    ack?.({ ok: false, message: 'Not authorized' });
                    return;
                }

                if (userRole === 'organizer') {
                    const event = await Event.findById(eventId).select('organizer_id');
                    if (!event || event.organizer_id.toString() !== userId) {
                        ack?.({ ok: false, message: 'Not authorized for this event' });
                        return;
                    }
                }

                socket.join(`event:${eventId}`);
                ack?.({ ok: true });
            } catch (error) {
                ack?.({ ok: false, message: 'Join room failed' });
            }
        });
    });

    return ioInstance;
};

const getIO = () => {
    if (!ioInstance) {
        throw new Error('Socket.IO is not initialized');
    }

    return ioInstance;
};

module.exports = { initSocket, getIO };

const Event = require('../models/Event');
const Category = require('../models/Category');
const Booking = require('../models/Booking');

const attachBannerUrl = (eventDoc, req) => {
    const eventObj = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
    if (eventObj.banner_url && !eventObj.banner_url.startsWith('http')) {
        eventObj.banner_url = `${req.protocol}://${req.get('host')}/${eventObj.banner_url}`;
    }
    return eventObj;
};

// Create a new event
exports.createEvent = async (req, res) => {
    try {
        // Parse JSON fields if they are strings (from FormData)
        if (typeof req.body.location === 'string') {
            req.body.location = JSON.parse(req.body.location);
        }
        if (typeof req.body.ticket_types === 'string') {
            req.body.ticket_types = JSON.parse(req.body.ticket_types);
        }

        // Handle file upload
        if (req.file) {
            // Store relative path (e.g., "uploads/filename.jpg") so client can construct full URL
            // or backend can dynamically prepend host
            const bannerUrl = `uploads/${req.file.filename}`;
            req.body.banner_url = bannerUrl;
        }

        // Validate category exists
        if (req.body.category_id) {
            const category = await Category.findById(req.body.category_id);
            if (!category) {
                return res.status(404).json({ message: 'Category not found' });
            }
        }

        // Initialize remaining_quantity for ticket_types if not provided
        if (req.body.ticket_types && Array.isArray(req.body.ticket_types)) {
            req.body.ticket_types = req.body.ticket_types.map(ticket => ({
                ...ticket,
                remaining_quantity: ticket.remaining_quantity !== undefined
                    ? ticket.remaining_quantity
                    : ticket.total_quantity
            }));
        }

        const eventData = {
            ...req.body,
            organizer_id: req.user._id // Set from auth middleware
        };

        const newEvent = new Event(eventData);
        const savedEvent = await newEvent.save();

        // Populate category and organizer details before sending response
        await savedEvent.populate('organizer_id', 'full_name email');
        await savedEvent.populate('category_id', 'name icon_url');

        const savedEventObj = savedEvent.toObject();
        if (savedEventObj.banner_url && !savedEventObj.banner_url.startsWith('http')) {
            savedEventObj.banner_url = `${req.protocol}://${req.get('host')}/${savedEventObj.banner_url}`;
        }

        res.status(201).json(savedEventObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get all events with Search & Filter
exports.getAllEvents = async (req, res) => {
    try {
        const { keyword, category, status } = req.query;

        let query = {};

        if (keyword) {
            query.title = { $regex: keyword, $options: 'i' };
        }

        if (category) {
            query.category_id = category;
        }

        if (status) {
            query.status = status;
        } else {
            // Default to published if not specified, unless admin/organizer logic added
            query.status = 'published';
        }

        const events = await Event.find(query)
            .populate('organizer_id', 'full_name email')
            .populate('category_id', 'name');

        const eventsWithUrl = events.map(event => {
            const eventObj = event.toObject();
            if (eventObj.banner_url && !eventObj.banner_url.startsWith('http')) {
                eventObj.banner_url = `${req.protocol}://${req.get('host')}/${eventObj.banner_url}`;
            }
            return eventObj;
        });

        res.status(200).json(eventsWithUrl);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get latest published events
// Query: ?n=5 (default 5)
exports.getLatestEvents = async (req, res) => {
    try {
        const limit = Math.max(parseInt(req.query.n, 10) || 5, 1);

        const events = await Event.find({ status: 'published' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('organizer_id', 'full_name email')
            .populate('category_id', 'name');

        const eventsWithUrl = events.map((event) => attachBannerUrl(event, req));
        res.status(200).json(eventsWithUrl);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get hot published events by purchased ticket quantity
// Query: ?n=5 (default 5)
exports.getHotEvents = async (req, res) => {
    try {
        const limit = Math.max(parseInt(req.query.n, 10) || 5, 1);

        const soldStats = await Booking.aggregate([
            { $match: { payment_status: 'paid' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$event_id',
                    tickets_sold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { tickets_sold: -1 } },
            { $limit: limit }
        ]);

        const eventIds = soldStats.map((s) => s._id);
        const soldMap = new Map(soldStats.map((s) => [String(s._id), s.tickets_sold]));

        const hotEvents = await Event.find({
            _id: { $in: eventIds },
            status: 'published'
        })
            .populate('organizer_id', 'full_name email')
            .populate('category_id', 'name');

        const sortedHotEvents = hotEvents
            .sort((a, b) => (soldMap.get(String(b._id)) || 0) - (soldMap.get(String(a._id)) || 0))
            .slice(0, limit)
            .map((event) => ({
                ...attachBannerUrl(event, req),
                tickets_sold: soldMap.get(String(event._id)) || 0
            }));

        res.status(200).json(sortedHotEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get a single event by ID
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer_id', 'full_name email')
            .populate('category_id', 'name');
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Convert to object and append full URL to banner_url if relative
        const eventObj = event.toObject();
        if (eventObj.banner_url && !eventObj.banner_url.startsWith('http')) {
            eventObj.banner_url = `${req.protocol}://${req.get('host')}/${eventObj.banner_url}`;
        }
        res.status(200).json(eventObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update an event
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership or admin
        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        // Convert to object and append full URL to banner_url if relative
        const eventObj = updatedEvent.toObject();
        if (eventObj.banner_url && !eventObj.banner_url.startsWith('http')) {
            eventObj.banner_url = `${req.protocol}://${req.get('host')}/${eventObj.banner_url}`;
        }
        res.status(200).json(eventObj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Cancel an event (soft delete)
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership or admin
        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to cancel this event' });
        }

        // Update status to cancelled instead of deleting
        const cancelledEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: { status: 'cancelled' } },
            { new: true }
        );

        res.status(200).json({ 
            message: 'Event has been cancelled',
            event: cancelledEvent
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get events by organizer
exports.getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer_id: req.user._id });
        console.log(events);
        console.log(req);
        const eventsWithUrl = events.map(event => {
            const eventObj = event.toObject();
            if (eventObj.banner_url && !eventObj.banner_url.startsWith('http')) {
                eventObj.banner_url = `${req.protocol}://${req.get('host')}/${eventObj.banner_url}`;
            }
            return eventObj;
        });
        res.json(eventsWithUrl);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

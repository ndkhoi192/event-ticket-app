const Event = require('../models/Event');
const Category = require('../models/Category');

// Create a new event
exports.createEvent = async (req, res) => {
    try {
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
        
        res.status(201).json(savedEvent);
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
        res.status(200).json(events);
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
        res.status(200).json(event);
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
        res.status(200).json(updatedEvent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership or admin
        if (event.organizer_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        await Event.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Event has been deleted' });
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
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user by ID (Admin or User themselves)
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.full_name = req.body.full_name || user.full_name;
            user.avatar_url = req.body.avatar_url || user.avatar_url;

            // If password is updated, it should be hashed, but for simplicity assuming separate change password route usually
            // Ignoring password update here to avoid rehashing issues without logic

            // Admin can update roles
            if (req.user.role === 'admin' && req.body.role) {
                user.role = req.body.role;
            }

            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                full_name: updatedUser.full_name,
                email: updatedUser.email,
                role: updatedUser.role
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Save an event
// @route   POST /api/users/me/saved-events/:eventId
// @access  Private
exports.saveEvent = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const eventId = req.params.eventId;

        if (!user.saved_events.includes(eventId)) {
            user.saved_events.push(eventId);
            await user.save();
        }

        res.json(user.saved_events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unsave an event
// @route   DELETE /api/users/me/saved-events/:eventId
// @access  Private
exports.unsaveEvent = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const eventId = req.params.eventId;

        user.saved_events = user.saved_events.filter(id => id.toString() !== eventId);
        await user.save();

        res.json(user.saved_events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get populated saved events
// @route   GET /api/users/me/saved-events
// @access  Private
exports.getSavedEvents = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('saved_events');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const publishedSavedEvents = (user.saved_events || []).filter((event) => event?.status === 'published');
        res.json(publishedSavedEvents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

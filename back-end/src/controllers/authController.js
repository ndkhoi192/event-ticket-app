const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendNewPasswordEmail } = require('../services/mailService');

const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'If an account exists with this email, a new password has been sent.';
const DEFAULT_USER_ROLE = 'attendee';
const TEMP_PASSWORD_LENGTH = 10;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const sanitizeName = (name) => String(name || '').trim();

const toAuthPayload = (user) => ({
    _id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id),
});

const generateTemporaryPassword = (length = TEMP_PASSWORD_LENGTH) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i += 1) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.registerUser = async (req, res) => {
    try {
        const { full_name, email, password, role } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const sanitizedName = sanitizeName(full_name);

        if (!sanitizedName || !normalizedEmail || !password) {
            return res.status(400).json({ message: 'Full name, email and password are required' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            full_name: sanitizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: role || DEFAULT_USER_ROLE
        });

        if (user) {
            return res.status(201).json(toAuthPayload(user));
        } else {
            return res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check for user email
        const user = await User.findOne({ email: normalizedEmail });
        if (user && (await bcrypt.compare(password, user.password))) {
            return res.json(toAuthPayload(user));
        } else {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(200).json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
        }

        const newPassword = generateTemporaryPassword();
        const previousPasswordHash = user.password;
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        try {
            await sendNewPasswordEmail({
                to: user.email,
                fullName: user.full_name,
                newPassword,
            });
        } catch (mailError) {
            user.password = previousPasswordHash;
            await user.save();
            return res.status(500).json({ message: 'Could not send reset email. Please try again later.' });
        }

        return res.status(200).json({ message: FORGOT_PASSWORD_SUCCESS_MESSAGE });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

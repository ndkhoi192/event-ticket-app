const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const allowedTypes = /jpeg|jpg|png|gif|webp/;

const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp).'));
    },
});

const uploadBufferToCloudinary = (buffer, options = {}) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
        stream.end(buffer);
    });

exports.cloudinaryTestUploadMiddleware = memoryUpload.single('image');

exports.cloudinaryHealth = async (req, res) => {
    const hasConfig = Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
        ok: true,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || null,
        configured: hasConfig,
        required_fields: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    });
};

exports.cloudinaryTestUpload = async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({
                message: 'Cloudinary env vars are missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file found. Send multipart/form-data with field name image.' });
        }

        const folder = req.body.folder || 'event-ticket-app/test';
        const result = await uploadBufferToCloudinary(req.file.buffer, {
            folder,
            resource_type: 'image',
        });

        return res.status(201).json({
            message: 'Image uploaded to Cloudinary successfully.',
            data: {
                public_id: result.public_id,
                secure_url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
                created_at: result.created_at,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Cloudinary upload failed.',
            error: error.message,
        });
    }
};

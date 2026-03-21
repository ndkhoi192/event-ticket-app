const express = require('express');
const {
    cloudinaryHealth,
    cloudinaryTestUploadMiddleware,
    cloudinaryTestUpload,
} = require('../controllers/cloudinaryController');

const router = express.Router();

router.get('/health', cloudinaryHealth);
router.post('/test-upload', cloudinaryTestUploadMiddleware, cloudinaryTestUpload);

module.exports = router;

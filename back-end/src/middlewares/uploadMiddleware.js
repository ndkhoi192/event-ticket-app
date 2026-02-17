const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use path relative to project root
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        // Create unique filename: fieldname-timestamp.ext
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter for images
const fileFilter = (req, file, cb) => {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif|webp/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
});

module.exports = upload;

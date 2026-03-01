// For now, we will return the data string as is. 
// In a real app, you would use a library like 'qrcode' to generate a base64 string or image.
// Since the prompt requirement was "qr_code_data (unique string)", we are already generating that in the controller.
// This utility can be used if we need to actually generate the image representation.

// Installing qrcode: npm install qrcode
const QRCode = require('qrcode');

const generateQR = async (data) => {
    try {
        return await QRCode.toDataURL(data);
    } catch (err) {
        console.error(err);
        return null;
    }
};

module.exports = generateQR;

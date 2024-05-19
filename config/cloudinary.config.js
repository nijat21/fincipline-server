const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        allowed_formats: ['jpg', 'png'],
        folder: 'fincipline'
    }
});

module.exports = multer({ storage });

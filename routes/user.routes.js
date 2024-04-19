const router = require('express').Router();
const mongoose = require('mongoose');
const axios = require('axios');
const backend = process.env.BACKEND;
const fileUploader = require('../config/cloudinary.config');
const User = require('../models/User.model');
const Account = require('../models/Account.model');
const Bank = require('../models/Bank.model');
const { decryptWithAes } = require('../middleware/crypto.middleware');
const { deactivateAccessToken } = require('../middleware/account.middleware');

// Upload a profile photo
router.post('/upload', fileUploader.single('file'), (req, res, next) => {
    // Save image in cloudinary
    try {
        res.status(200).json({ imgUrl: req.file.path });
    } catch (error) {
        console.log("Couldn't upload the file", error);
        next(error);
    }
});

// Update user with imgUrl
router.put('/updateImg', async (req, res, next) => {
    const { user_id, imgUrl } = req.body;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        if (!imgUrl) {
            return res.status(400).json({ message: 'No image url passed' });
        }

        const updatedUser = await User.findByIdAndUpdate(user_id, { imgUrl }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);

    } catch (error) {
        console.log('Error updating the user photo', error);
        next(error);
    }
});


// Edit User information => Change email and/or password



// Delete user and all bank accounts
router.delete('/deleteUser/:user_id', async (req, res, next) => {
    const { user_id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }

        // Deactivate access token from Plaid
        // Should loop for each bank
        const banks = await Bank.find({ user_id: user_id }).populate('accounts');

        if (banks.length > 0) {
            for (const bank of banks) {
                const access_token = decryptWithAes(bank.access_token);
                await deactivateAccessToken(access_token);
            }
        }

        await User.findByIdAndDelete(user_id);
        await Bank.deleteMany({ user_id: user_id });
        await Account.deleteMany({ user_id: user_id });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.log('Error deleting the user', error);
        next(error);
    }
});


module.exports = router;
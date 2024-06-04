const router = require('express').Router();
const Account = require('../models/Account.model');
const Bank = require('../models/Bank.model');
const mongoose = require('mongoose');
const { decryptWithAes } = require('../middleware/crypto.middleware');
const { deactivateAccessToken } = require('../middleware/account.middleware');

// Get all banks the user have
router.get('/banks/:user_id', async (req, res, next) => {
    const { user_id } = req.params;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        const banks = await Bank.find({ user_id }).populate('accounts').select('-access_token');
        console.log(banks);
        // WHen returning to client side, ignore access_token **CONFIDENTIAL
        res.status(200).json(banks);
    } catch (error) {
        console.log("Error occurred getting banks");
        next(error);
    }
});

// Delete a bank connection
router.delete('/banks/:bank_id', async (req, res, next) => {
    const { bank_id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(bank_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        // Deactivate access token from Plaid
        // Should loop for each bank
        const bank = await Bank.findById(bank_id).populate('accounts');
        if (bank) {
            const access_token = decryptWithAes(bank.access_token);
            await deactivateAccessToken(access_token);
            await Account.deleteMany({ bank_id });
            await Bank.findByIdAndDelete(bank_id);
        }

        res.json({ message: 'Bank is successfully deleted' });
    } catch (error) {
        console.log('Error deleting the bank', error);
        next(error);
    }
});


// Get accounts for this bank
router.get('/accounts/:bank_id', async (req, res, next) => {
    const { bank_id } = req.params;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(bank_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        console.log('Trying to get accounts');

        const accounts = await Account.find({ bank_id });
        console.log(accounts);
        res.status(200).json(accounts);
    } catch (error) {
        console.log("Error occurred getting accounts");
        next(error);
    }
});



module.exports = router;
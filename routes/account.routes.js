const router = require('express').Router();
const Account = require('../models/Account.model');
const mongoose = require('mongoose');

// Get bank accounts for this user
router.get('/accounts/:user_id', async (req, res, next) => {
    const { user_id } = req.params;

    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        console.log('Trying to get accounts');

        const accounts = await Account.find({ user_id });
        console.log(accounts);
        res.status(200).json(accounts);
    } catch (error) {
        console.log("Error occurred getting accounts");
        next(error);
    }
});


// Remove bank accounts
router.delete('/account/:account_id', async (req, res, next) => {
    const { _id: account_id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: 'Id is not valid' });
        }
        await Account.findOneAndDelete({ _id });
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.log('Error deleting the project', error);
        next(error);
    }
});


module.exports = router;
const router = require('express').Router();
const Account = require('../models/Account.model');


// Get bank accounts for this user
router.get('/accounts', async (req, res, next) => {
    const { user_id } = req.body;
    try {
        const accounts = await Account.findOne({ user_id });
        console.log(accounts);
        res.status(200).json(accounts);
    } catch (error) {
        console.log("Error occurred getting accounts");
        next(error);
    }
});

// Remove bank accounts


module.exports = router;
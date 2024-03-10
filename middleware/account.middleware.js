const mongoose = require('mongoose');
const Account = require('../models/Account.model');
const User = require('../models/User.model');

// Create an account
const saveAccessToken = async (res, ACCESS_TOKEN, user_id, metadata, account) => {

    // Save access token in his accounts
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }

    // Add a single account
    const newAccount = await Account.create({ access_token: ACCESS_TOKEN, user_id, institution_name: metadata.institution.name, institution_id: metadata.institution.institution_id, account_mask: account.mask });

    if (!newAccount) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }
    return newAccount;
};

// Check for duplicates and Save in Accounts
const duplicatesCheckAndSave = async (res, user_id, ACCESS_TOKEN, metadata) => {
    const accounts = metadata.accounts;

    for (const account of accounts) {
        // Check for duplicates
        const accountExists = await Account.findOne({ user_id, institution_id: metadata.institution.institution_id, account_mask: account.mask });
        if (accountExists) {
            console.log('Account already exists');
            return res.status(400).json({ message: 'Account already exists' });
        } else {
            // Save access token in his accounts
            const newAccount = await saveAccessToken(res, ACCESS_TOKEN, user_id, metadata, account);
            // Update the user with the access token
            await User.findByIdAndUpdate(user_id, { $push: { accounts: newAccount._id } });
            res.json({ message: 'New account(s) added' });
        }
    };
};


module.exports = { saveAccessToken, duplicatesCheckAndSave };
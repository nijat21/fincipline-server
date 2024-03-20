const mongoose = require('mongoose');
const Account = require('../models/Account.model');
const User = require('../models/User.model');
const Bank = require('../models/Bank.model');

// Create a Bank
const createBank = async (res, ACCESS_TOKEN, user_id, metadata) => {

    // Save access token in his accounts
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }

    // Add a single account
    const newBank = await Bank.create({ access_token: ACCESS_TOKEN, user_id, institution_name: metadata.institution.name, institution_id: metadata.institution.institution_id });

    if (!newBank) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }
    return newBank;
};

// Create an account
const createAccount = async (res, ACCESS_TOKEN, bank_id, user_id, metadata, account) => {

    // Save access token in his accounts
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }

    // Add a single account
    const newAccount = await Account.create({
        access_token: ACCESS_TOKEN, user_id, institution_name: metadata.institution.name,
        institution_id: metadata.institution.institution_id, account_mask: account.mask, bank_id,
        acc_type: account.type, acc_subtype: account.subtype
    });

    if (!newAccount) {
        return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }
    return newAccount;
};

// Check for accounts' duplicates and create if not a duplicate
const checkAccountDuplicates = async (res, ACCESS_TOKEN, bank_id, user_id, metadata) => {
    const accountsResponse = metadata.accounts;

    if (accountsResponse.length === 0) {
        return res.status(400).json({ message: 'There is no accounts related to this bank' });
    }
    for (const account of accountsResponse) {
        // Check for duplicates
        const accountExists = await Account.findOne({ bank_id, account_mask: account.mask });
        if (accountExists) {
            console.log('Account already exists');
        } else {
            // Save access token in his accounts
            const newAccount = await createAccount(res, ACCESS_TOKEN, bank_id, user_id, metadata, account);
            console.log(newAccount);

            // Update the user with the access token
            await Bank.findByIdAndUpdate(bank_id, { $push: { accounts: newAccount._id } });
            // await Bank.findByIdAndUpdate(bank_id, { $push: { accounts: newAccount._id } });
            console.log('New account added');
        }
    };
};

// Check for duplicates and save
const duplicatesCheckAndSave = async (res, user_id, ACCESS_TOKEN, metadata) => {

    // Check for bank duplicates and create if not a duplicate
    const bankExists = await Bank.findOne({ user_id, institution_id: metadata.institution.institution_id });
    if (bankExists) {
        console.log('Bank already exists');

        // If bank exists, check if accounts exist for that bank account
        checkAccountDuplicates(res, ACCESS_TOKEN, bankExists._id, user_id, metadata);
    } else {
        const newBank = await createBank(res, ACCESS_TOKEN, user_id, metadata);
        console.log(newBank);

        // If bank just added, add new accounts
        checkAccountDuplicates(res, ACCESS_TOKEN, newBank._id, user_id, metadata);

        await User.findByIdAndUpdate(user_id, { $push: { banks: newBank._id } });
        console.log('New bank account added');
    }
    res.json({ message: 'Financial institutions and respective accounts are added' });
};

// Retrieve access token
const retrieveAccessToken = async (user_id, bank_id) => {
    if (!user_id || !bank_id) {
        console.log(`Neccessary credentials aren't provided`);
    }
    try {
        const bank = await Bank.find({ user_id, _id: bank_id });
        if (!bank) {
            console.log(`Couldn't find such a bank`);
        }
        return bank.access_token;
    } catch (error) {
        console.log('Error retrieving the access token');
        next(error);
    }

};


module.exports = { duplicatesCheckAndSave, retrieveAccessToken };
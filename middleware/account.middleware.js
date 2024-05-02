const mongoose = require('mongoose');
const Account = require('../models/Account.model');
const User = require('../models/User.model');
const Bank = require('../models/Bank.model');
const client = require('../config/plaidClient');
const { decryptWithAes } = require('../middleware/crypto.middleware');

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
        access_token: ACCESS_TOKEN, user_id, account_id: account.id, institution_name: metadata.institution.name,
        institution_id: metadata.institution.institution_id, account_name: account.name, account_mask: account.mask, bank_id,
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
            console.log("New accounts", newAccount);

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
    const bankExists = await Bank.findOne({ user_id, institution_id: metadata.institution.institution_id }).select('-access_token');
    if (bankExists) {
        console.log('Bank already exists');
        // If bank exists, check add new accounts and return the bank
        checkAccountDuplicates(res, ACCESS_TOKEN, bankExists._id, user_id, metadata);
        return bankExists;
    } else {
        const bankCreated = await createBank(res, ACCESS_TOKEN, user_id, metadata);
        const newBank = await Bank.findOne({ _id: bankCreated._id }).select('-access_token');

        // If bank just added, add new accounts, update user and return new bank
        checkAccountDuplicates(res, ACCESS_TOKEN, newBank._id, user_id, metadata);
        await User.findByIdAndUpdate(user_id, { $push: { banks: newBank._id } });
        return newBank;
    }
};

// Retrieve access token
const retrieveAccessToken = async (user_id, bank_id) => {

    const bank = await Bank.findOne({ user_id, _id: bank_id });
    if (!bank) {
        console.log(`Couldn't find such a bank`);
    }
    return bank.access_token;
};

// Deactivate access token
const deactivateAccessToken = async (accessToken) => {
    if (!accessToken) {
        console.log("Access token not received");
        return;
    }
    await client.itemRemove({ access_token: accessToken });
};



// Retrieve transactions 
const retrieveTransactions = async (user_id, bank_id) => {
    // Get access_token and decrypt it
    const response = await retrieveAccessToken(user_id, bank_id);
    const access_token = decryptWithAes(response);

    // Set cursor to empty to receive all historical updates
    let cursor = null;
    let hasMore = true;

    // New transaction updates since "cursor"
    let added = [];
    // let modified = [];
    // let removed = [];

    // Iterate through each page of new transaction updates for item
    while (hasMore) {
        const request = {
            access_token: access_token,
            cursor: cursor,
        };
        const response = await client.transactionsSync(request);
        const data = response.data;

        // Add this page of results
        added = added.concat(data.added);
        // modified = modified.concat(data.modified);
        // removed = removed.concat(data.removed);
        hasMore = data.has_more;

        // Update cursor to the next cursor
        cursor = data.next_cursor;
    }
    // Sorting function
    const compareTxnsByDateAscending = (a, b) => (a.date < b.date) - (a.date > b.date);
    const sorted_added = [...added].sort(compareTxnsByDateAscending);

    // Return the 8 most recent transactions
    const edited_sorted_added = addAccountDetails(sorted_added);
    // const sorted_modified = [...modified].sort(compareTxnsByDateAscending);
    // const sorted_removed = [...removed].sort(compareTxnsByDateAscending);

    return edited_sorted_added;
};


// Add account details into each transaction
const addAccountDetails = async (tranArray) => {
    if (tranArray.length < 1) {
        console.log('Empty transactions array to add account details');
        return;
    }

    await Promise.all(tranArray.map(async (tran) => {
        const accountDetails = await Account.findOne({ account_id: tran.account_id }).select('-access_token');
        // Copying accountDetails into tran object
        tran.account_details = accountDetails;
    }));

    return tranArray;
};


module.exports = { duplicatesCheckAndSave, retrieveAccessToken, deactivateAccessToken, retrieveTransactions };
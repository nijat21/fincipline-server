const Account = require('../models/Account.model');
const mongoose = require('mongoose');

// Create an account
const saveAccessToken = async (RES, ACCESS_TOKEN, USER_ID, METADATA, ACCOUNT_MASK) => {
    const institutionName = METADATA.institution.name;
    const institutionId = METADATA.institution.institution_id;

    // Save access token in his accounts
    if (!mongoose.Types.ObjectId.isValid(USER_ID)) {
        return RES.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }

    // Add a single account
    const newAccount = await Account.create({ access_token: ACCESS_TOKEN, user_id: USER_ID, institution_name: institutionName, institution_id: institutionId, account_mask: ACCOUNT_MASK });

    if (!newAccount) {
        return RES.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
    }
    return newAccount;
};

// Check for duplicates
const checkDuplicateAccounts = async (metadata, existingInstitutionId) => {
    const institutionId = metadata.institution.institution_id;
    const institutionName = metadata.institution.name;
    const accounts = metadata.accounts;
    return metadata;
};

module.exports = { saveAccessToken, checkDuplicateAccounts };
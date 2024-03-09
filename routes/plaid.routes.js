const router = require("express").Router();
const client = require('../config/plaidClient');
const { encryptWithAes, decryptWithAes } = require('../middleware/crypto.middleware');
const { saveAccessToken, checkDuplicateAccounts } = require('../middleware/account.middleware');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Account = require('../models/Account.model');


const APP_PORT = process.env.APP_PORT || 8000;
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || Products.Transactions).split(',');
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',');
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';
// const PLAID_ANDROID_PACKAGE_NAME = process.env.PLAID_ANDROID_PACKAGE_NAME || '';

// Route to create a Link token
router.post('/create_link_token', async (req, res, next) => {
    try {
        const { user_id, client_name } = req.body;

        if (!user_id || !client_name) {
            return res.status(500).json({ message: `User id and client name should be provided from client.` });
        }

        const specs = {
            user: {
                client_user_id: user_id,
            },
            client_name: client_name,
            products: PLAID_PRODUCTS,
            country_codes: PLAID_COUNTRY_CODES,
            language: 'en'
        };

        if (PLAID_REDIRECT_URI !== "") {
            specs.redirect_uri = PLAID_REDIRECT_URI;
        }

        const createTokenResponse = await client.linkTokenCreate(specs);
        res.status(200).json(createTokenResponse.data);
    } catch (error) {
        console.log('Error in creating the link token', error);
        next(error);
    }
});

// Route to exchange the Public token to Access token
router.post('/set_access_token', async (req, res, next) => {
    const { public_token, user_id, metadata } = req.body;
    const accounts = metadata.accounts;

    if (!public_token) {
        console.log('Public token is missing');
    }
    try {
        // Check metadata for duplicates before exchanging the token
        // const isDuplicateAccount = checkDuplicateAccounts(metadata);
        console.log(metadata);


        // Exchange temporary public token to an access token
        const tokenResponse = await client.itemPublicTokenExchange({ public_token: public_token });
        if (!tokenResponse) {
            return res.status(500).json({ message: `Access token couldn't be created` });
        }

        // Encrypt the Access Token
        ACCESS_TOKEN = encryptWithAes(tokenResponse.data.access_token);
        ITEM_ID = tokenResponse.data.item_id;

        // Save access token in his accounts
        // Run a loop through accounts and add each one individually to the database
        accounts.map(async (account) => {
            const newAccount = await saveAccessToken(res, ACCESS_TOKEN, user_id, metadata, account.mask);
            // Update the user with the access token
            await User.findByIdAndUpdate(user_id, { $push: { accounts: newAccount._id } });
        });

        res.json({ message: 'New account(s) added' });

    } catch (error) {
        console.log('Error converting the token', error);
        next(error);
    }
});




module.exports = router;
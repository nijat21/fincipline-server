const router = require("express").Router();
const client = require('../config/plaidClient');
const { encryptWithAes, decryptWithAes } = require('../middleware/crypto.middleware');
const { duplicatesCheckAndSave, retrieveAccessToken, retrieveTransactions } = require('../middleware/account.middleware');
const Bank = require('../models/Bank.model');
// Plaid variables
// const APP_PORT = process.env.APP_PORT || 8000;
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS).split(',');
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(',');
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';
let ACCESS_TOKEN = '';


// Route to create a Link token
router.post('/create_link_token', async (req, res, next) => {
    try {
        const { user_id, client_name } = req.body;

        if (!user_id || !client_name) {
            return res.status(500).json({ message: `User id and client name should be provided from client.` });
        }
        console.log('Plaid products', PLAID_PRODUCTS);
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

    if (!public_token) {
        console.log('Public token is missing');
        return res.status(400).json({ message: 'Public token is missing' });
    } else {
        try {
            // console.log("Metadata", metadata);
            // Exchange temporary public token to an access token
            const tokenResponse = await client.itemPublicTokenExchange({ public_token: public_token });
            if (!tokenResponse) {
                return res.status(500).json({ message: `Access token couldn't be created` });
            } else {
                // Encrypt the Access Token
                ACCESS_TOKEN = encryptWithAes(tokenResponse.data.access_token);
                const bank = await duplicatesCheckAndSave(res, user_id, ACCESS_TOKEN, metadata);
                res.status(200).json({ bank, message: "Account successfully added!" });
            }
        } catch (error) {
            console.log('Error converting the token', error);
            res.status(500).json({ message: "Error adding the account" });
        }
    }
});



// Retrieve ACH or ETF Auth data for an Item's accounts
router.get('/auth/:user_id/:bank_id', async (req, res, next) => {
    // Get each bank's access token separately and make separate requests
    const { user_id, bank_id } = req.params;

    try {
        const response = await retrieveAccessToken(user_id, bank_id);
        const access_token = decryptWithAes(response);
        const authResponse = await client.authGet({ access_token });
        res.status(200).json(authResponse.data);
        console.log("Here auth response", authResponse.data);
    } catch (error) {
        console.log('Error getting auth', error);
        next(error);
    }
});


// Retrieve the balance of bank accounts
router.get('/balance/:user_id/:bank_id', async (req, res, next) => {
    const { user_id, bank_id } = req.params;
    if (!user_id || !bank_id) {
        res.status(400).json({ message: "Required credentials weren't send from frontend" });
    }
    try {
        const response = await retrieveAccessToken(user_id, bank_id);
        const access_token = decryptWithAes(response);
        const balanceResponse = await client.accountsBalanceGet({ access_token });
        res.status(200).json(balanceResponse.data);
    } catch (error) {
        console.log('Error retrieving the balance', error);
        res.status(500).json({ message: 'Error retrieving balance' });
    }
});

// Retrieve transactions of a specific bank
router.get('/transactions/:user_id/:bank_id', async (req, res, next) => {
    const { user_id, bank_id } = req.params;

    if (!user_id || !bank_id) {
        res.status(400).json({ message: "Required credentials weren't send from frontend" });
    }
    try {
        const response = await retrieveTransactions(user_id, bank_id);
        console.log(response);
        res.json({ added_transactions: response }); //, modified_transactions: sorted_modified, removed_transactions: sorted_removed });
    } catch (error) {
        console.log('Error retrieving the transactions', error);
        next(error);
    }
});

// Retrieve all the transactions of user
router.get('/transactions/:user_id', async (req, res, next) => {
    const { user_id } = req.params;

    if (!user_id) {
        res.status(400).json({ message: "user_id wasn't sent from frontend" });
    }
    try {
        // Deactivate access token from Plaid
        // Should loop for each bank
        const banks = await Bank.find({ user_id: user_id }).populate('accounts');
        let users_transactions = [];
        let sorted_transactions;

        if (banks.length > 0) {
            for (const bank of banks) {
                const bank_id = bank._id;
                const sorted_added = await retrieveTransactions(user_id, bank_id);
                users_transactions = [...users_transactions, ...sorted_added];
            }
            const compareTxnsByDateDescending = (a, b) => (a.date < b.date) - (a.date > b.date);
            sorted_transactions = users_transactions.sort(compareTxnsByDateDescending);
            // console.log(sorted_transactions);
        }

        res.json({ sorted_transactions }); //, modified_transactions: sorted_modified, removed_transactions: sorted_removed });
    } catch (error) {
        console.log('Error retrieving the transactions', error);
        next(error);
    }
});



module.exports = router;
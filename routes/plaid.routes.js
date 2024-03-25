const router = require("express").Router();
const client = require('../config/plaidClient');
const { encryptWithAes, decryptWithAes } = require('../middleware/crypto.middleware');
const { duplicatesCheckAndSave, retrieveAccessToken } = require('../middleware/account.middleware');
// Plaid variables
const APP_PORT = process.env.APP_PORT || 8000;
const PLAID_PRODUCTS = (process.env.PLAID_PRODUCTS || Products.Transactions).split(',');
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
            // Exchange temporary public token to an access token
            const tokenResponse = await client.itemPublicTokenExchange({ public_token: public_token });
            if (!tokenResponse) {
                return res.status(500).json({ message: `Access token couldn't be created` });
            } else {
                // Encrypt the Access Token
                ACCESS_TOKEN = encryptWithAes(tokenResponse.data.access_token);
                console.log("Encrypted access token:", ACCESS_TOKEN);

                // Decrypt the Access Token test
                // const decryptedToken = decryptWithAes(ACCESS_TOKEN);
                // console.log("Decrypted access token:", decryptedToken);

                // Check metadata for duplicates before saving the token
                console.log(metadata);
                await duplicatesCheckAndSave(res, user_id, ACCESS_TOKEN, metadata);
            }
        } catch (error) {
            console.log('Error converting the token', error);
            next(error);
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

// Retrieve transactions of banks
router.get('/transactions/:user_id/:bank_id', async (req, res, next) => {
    const { user_id, bank_id } = req.params;
    if (!user_id || !bank_id) {
        res.status(400).json({ message: "Required credentials weren't send from frontend" });
    }
    try {
        const response = await retrieveAccessToken(user_id, bank_id);
        const access_token = decryptWithAes(response);

        // Set cursor to empty to receive all historical updates
        let cursor = null;

        // New transaction updates since "cursor"
        let added = [];
        let modified = [];
        // Removed transaction ids
        let removed = [];
        let hasMore = true;
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
            modified = modified.concat(data.modified);
            removed = removed.concat(data.removed);
            hasMore = data.has_more;
            // Update cursor to the next cursor
            cursor = data.next_cursor;
        }

        const compareTxnsByDateAscending = (a, b) => (a.date > b.date) - (a.date < b.date);
        // Return the 8 most recent transactions
        const sorted_added = [...added].sort(compareTxnsByDateAscending);
        const sorted_modified = [...modified].sort(compareTxnsByDateAscending);
        const sorted_removed = [...removed].sort(compareTxnsByDateAscending);
        res.json({ added_transactions: sorted_added, modified_transactions: sorted_modified, removed_transactions: sorted_removed });
    } catch (error) {
        console.log('Error retrieving the transactions', error);
        next(error);
    }
});

// 



module.exports = router;
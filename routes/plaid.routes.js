const router = require("express").Router();
const client = require('../config/plaidClient');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User.model');

const saltRounds = 10;

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
    const { public_token, user_id } = req.body;

    userId = user_id;

    if (!public_token) {
        console.log('Public token is missing');
    }
    try {
        const tokenResponse = await client.itemPublicTokenExchange({ public_token: public_token });
        if (!tokenResponse) {
            return res.status(500).json({ message: `Access token couldn't be created` });
        }
        // res.json({ message: 'Access token created successfully' });

        // Encrypt the Access Token
        const salt = bcrypt.genSaltSync(saltRounds);
        ACCESS_TOKEN = bcrypt.hashSync(tokenResponse.data.access_token, salt);
        ITEM_ID = tokenResponse.data.item_id;

        // find the current user and save access token in his profile
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
        }

        const updatedUser = await User.findByIdAndUpdate(user_id,
            {
                $push: {
                    accounts: { access_token: ACCESS_TOKEN, item_id: ITEM_ID }
                }
            },
            { new: true }
        );
        if (!updatedUser) {
            return res.status(400).json({ message: 'User id is not valid. Cannot save the access token.' });
        }

        res.json({ message: 'Access token created.' });
        console.log(updatedUser);
        console.log(ITEM_ID);
        // Invalidate and replace Access token
        // const invalidateAndReplaceAccessToken = () => {

        // };

    } catch (error) {
        console.log('Error converting the token', error);
        next(error);
    }
});




module.exports = router;
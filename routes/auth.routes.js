const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User.model');
const Account = require('../models/Account.model');
const Bank = require('../models/Bank.model');
const { isAuthenticated } = require('../middleware/jwt.middleware');
const fileUploader = require('../config/cloudinary.config');
const { decryptWithAes } = require('../middleware/crypto.middleware');
const { deactivateAccessToken } = require('../middleware/account.middleware');
const { OAuth2Client } = require('google-auth-library');
const saltRounds = 10;
// Creating a new client
const clientId = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(clientId);

// Function to generate token to avoid duplication
const generateAuthToken = (user) => {
    const payload = { _id: user._id, email: user.email, name: user.name, imgUrl: user.imgUrl };
    return jwt.sign(payload, process.env.TOKEN_SECRET, {
        algorithm: 'HS256',
        expiresIn: '6h'
    });
};

router.post('/signup', async (req, res, next) => {
    const { email, password, name } = req.body;

    try {
        if (email === "" || password === "" || name === "") {
            return res.status(400).json({ message: "All fields are mandatory!" });
        }

        // Email validation regex
        const emailRegex = /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Provide a valid email address!' });
        }

        // Password validation regex
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).{6,}$/;
        if (!passRegex.test(password)) {
            return res.status(400).json({ message: 'Password needs to be consisted of at least 6 characters. It must include at least 1 capital letter, 1 special character!' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'This email is already registered!' });
        }

        // Password encryption 
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPass = bcrypt.hashSync(password, salt);

        const newUser = await User.create({ email, name, password: hashedPass });
        const authToken = generateAuthToken(newUser);


        res.json({ authToken });

    } catch (error) {
        console.log('Error creating the user', error);
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    try {
        if (email === "" || password === "") {
            return res.status(400).json({ message: 'All fields are mandatory!' });
        }

        // Find user
        const user = await User.findOne({ email });

        // Check if the user exists 
        if (!user) {
            return res.status(400).json({ message: "Provided email in not registered!" });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (isPasswordCorrect) {
            // Payload excluding password
            const authToken = generateAuthToken(user);
            return res.status(200).json({ authToken });
        } else {
            return res.status(400).json({ message: "Wrong password!" });
        }
    } catch (error) {
        console.log('Error logging in the user!', error);
        next(error);
    }
});

// Generate a random password that complies with regex
const generateCompliantPassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const specialCharacters = '`!@#$%^&*()_+-=[]{};:"\\|,.<>/?~';
    const allCharacters = lowercase + uppercase + specialCharacters;

    const getRandomCharacter = (str) => str[Math.floor(Math.random() * str.length)];

    let password = '';
    password += getRandomCharacter(lowercase);
    password += getRandomCharacter(uppercase);
    password += getRandomCharacter(specialCharacters);

    for (let i = 3; i < 8; i++) {
        password += getRandomCharacter(allCharacters);
    }

    return password;
};


// Google login
router.post('/googleAuth', async (req, res, next) => {
    const { google_token } = req.body;
    console.log("Token received in backend", google_token);

    try {
        const ticket = await client.verifyIdToken({
            idToken: google_token,
            audience: clientId
        });
        console.log("Ticket", ticket);

        const payload = ticket.getPayload();
        const { name, email, picture } = payload;

        // Does user exist? If not, create the user
        const user = await User.findOne({ email });
        if (!user) {
            const randomPassword = generateCompliantPassword();
            const hashedPassword = bcrypt.hashSync(randomPassword, saltRounds);

            const user1 = await User.create({
                name,
                email,
                password: hashedPassword,
                imgUrl: picture,
                isSocialLogin: true
            });

            // Creating a JWT payload
            const authToken = generateAuthToken(user1);
            return res.status(200).json({ authToken });
        } else {
            // Creating a JWT payload
            const authToken = generateAuthToken(user);
            return res.status(200).json({ authToken });
        }

    } catch (error) {
        console.log('Error exchanging token for Google login!', error);
        next(error);
    }
});

// When there is already a valid token 
router.get('/verify', isAuthenticated, async (req, res, next) => {
    // if the jwt is valid, the payload gets decoded by the middleware and is made available in req.payload
    console.log("Request payload", req.payload);
    const user = await User.findById(req.payload._id, { password: 0 });
    res.json(user);
});

// Upload a profile photo
router.post('/upload', fileUploader.single('file'), (req, res, next) => {
    // Save image in cloudinary
    try {
        res.status(200).json({ imgUrl: req.file.path });
    } catch (error) {
        console.log("Couldn't upload the file!", error);
        next(error);
    }
});

// Update user with imgUrl
router.put('/updateImg', async (req, res, next) => {
    const { user_id, imgUrl } = req.body;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid!' });
        }
        if (!imgUrl) {
            return res.status(400).json({ message: 'No image url passed!' });
        }

        const updatedUser = await User.findByIdAndUpdate(user_id, { imgUrl }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found!' });
        }
        res.json(updatedUser);

    } catch (error) {
        console.log('Error updating the user photo!', error);
        next(error);
    }
});

// Edit User information => Change email and/or password
// Update user password
router.put('/updatePassword', async (req, res, next) => {
    const { user_id, oldPassword, password } = req.body;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid!' });
        }
        if (!oldPassword || !password) {
            return res.status(400).json({ message: `Password update needs to include old and new passwords!` });
        }
        // Validate the old password
        const user = await User.findOne({ _id: user_id });
        if (!user) {
            return res.status(400).json({ message: "Provided email in not registered!" });
        }
        const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
        if (isPasswordCorrect) {
            // New Password validation regex
            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).{6,}$/;
            if (!passRegex.test(password)) {
                return res.status(400).json({ message: 'Password needs to be consisted of at least 6 characters. It must include at least 1 capital letter, 1 special character!' });
            }
            // Password encryption 
            const salt = bcrypt.genSaltSync(saltRounds);
            const hashedPass = bcrypt.hashSync(password, salt);
            // Password update
            const updatedUser = await User.findByIdAndUpdate(user_id, { password: hashedPass }, { new: true });
            res.json({ email: updatedUser.email, name: updatedUser.name, _id: updatedUser._id });
        } else {
            return res.status(400).json({ message: "Wrong password!" });
        }
    } catch (error) {
        console.log('Error updating the password!', error);
        next(error);
    }
});

// Update name and email
router.put('/updateUserDetails', async (req, res, next) => {
    const { user_id, name, email } = req.body;
    try {
        // check if the id passed is a valid value in our Db
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid!' });
        }
        if (!name && !email) {
            return res.status(400).json({ message: `Name and email should be provided for the update!` });
        }
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(400).json({ message: "Provided email in not registered!" });
        } else if (user.name === name && user.email === email) {
            return res.status(400).json({ message: "Provided name and email is identical to current ones!" });
        } else {
            if (!name) {
                const updatedUser = await User.findByIdAndUpdate(user_id, { email }, { new: true });
                res.json({ email: updatedUser.email, name: updatedUser.name, _id: updatedUser._id });
            } else if (!email) {
                const updatedUser = await User.findByIdAndUpdate(user_id, { name }, { new: true });
                res.json({ email: updatedUser.email, name: updatedUser.name, _id: updatedUser._id });
            } else {
                const updatedUser = await User.findByIdAndUpdate(user_id, { name, email }, { new: true });
                res.json({ email: updatedUser.email, name: updatedUser.name, _id: updatedUser._id });
            }
        }
    } catch (error) {
        console.log('Error updating user details', error);
        next(error);
    }
});

// Delete user and all bank accounts
router.delete('/deleteUser/:user_id', async (req, res, next) => {
    const { user_id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            return res.status(400).json({ message: 'Id is not valid!' });
        }

        // Deactivate access token from Plaid
        // Should loop for each bank
        const banks = await Bank.find({ user_id: user_id }).populate('accounts');

        if (banks.length > 0) {
            for (const bank of banks) {
                const access_token = decryptWithAes(bank.access_token);
                await deactivateAccessToken(access_token);
            }
        }

        await User.findByIdAndDelete(user_id);
        await Bank.deleteMany({ user_id: user_id });
        await Account.deleteMany({ user_id: user_id });
        res.json({ message: 'User deleted successfully!' });
    } catch (error) {
        console.log('Error deleting the user!', error);
        next(error);
    }
});



module.exports = router;
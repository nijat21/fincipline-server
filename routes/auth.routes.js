const router = require('express').Router();
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isAuthenticated } = require('../middleware/jwt.middleware');

const saltRounds = 10;

router.post('/signup', async (req, res, next) => {
    const { email, password, name } = req.body;

    try {
        if (email === "" || password === "" || name === "") {
            return res.status(400).json({ message: "All fields are mandatory" });
        }

        // Email validation regex
        const emailRegex = /\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Provide a valid email address' });
        }

        // Password validation regex
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).{6,}$/;
        if (!passRegex.test(password)) {
            return res.status(400).json({ message: 'Password needs to be consisted of at least 6 characters. It must include at least 1 capital letter, 1special character' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'This email is already registered' });
        }

        // Password encryption 
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPass = bcrypt.hashSync(password, salt);

        const newUser = await User.create({ email, name, password: hashedPass });

        res.json({ email: newUser.email, name: newUser.name, _id: newUser._id });

    } catch (error) {
        console.log('Error creating the user', error);
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    try {
        if (email === "" || password === "") {
            return res.status(400).json({ message: 'All fields are mandatory' });
        }

        // Find user
        const user = await User.findOne({ email });

        // Check if the user exists 
        if (!user) {
            return res.status(400).json({ message: "Provided email in not registered" });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (isPasswordCorrect) {
            // Payload excluding password
            const payload = { _id: user._id, email: user.email, name: user.name };
            const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
                algorithm: 'HS256',
                expiresIn: '6h'
            });

            return res.status(200).json({ authToken });
        } else {
            return res.status(400).json({ message: "Wrong password" });
        }
    } catch (error) {
        console.log('Error logging in the user', error);
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

module.exports = router;
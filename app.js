// ℹ️ Gets access to environment variables/settings
// https://www.npmjs.com/package/dotenv
require("dotenv").config();

// ℹ️ Connects to the database
require("./db");

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const express = require("express");


const app = express();


// ℹ️ This function is getting exported from the config folder. It runs most pieces of middleware
require("./config")(app);

// users aren't logged in, won't be able to make a request in projects and tasks. All the next routes are protected
const { isAuthenticated } = require('./middleware/jwt.middleware');

// 👇 Start handling routes here
const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

// Plaid routes
const plaidRoutes = require('./routes/plaid.routes');
app.use('/plaid', isAuthenticated, plaidRoutes);

// Account routes
const accountRoutes = require('./routes/bank.account.routes.js');
app.use('/account', isAuthenticated, accountRoutes);
// User routes
const userRoutes = require('./routes/user.routes.js');
app.use('/user', isAuthenticated, userRoutes);

// Authentication routes
const authRoutes = require('./routes/auth.routes.js');
app.use('/auth', authRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require("./error-handling")(app);

module.exports = app;

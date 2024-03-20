const app = require("./app");
// const https = require('https');
// const fs = require('fs');
// const privateKey = fs.readFileSync('cert.key', 'utf-8');
// const certificate = fs.readFileSync('cert.crt', 'utf-8');

// ℹ️ Sets the PORT for our app to have access to it. If no env has been set, we hard code it to 5005
const PORT = process.env.PORT || 5005;

// httpsServer = https.createServer({ key: privateKey, cert: certificate }, app);


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

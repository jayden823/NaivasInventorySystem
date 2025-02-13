require('dotenv').config(); // Load environment variables
const mysql = require('mysql2');
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'nodelogin'
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database');
});

// Express session setup
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Login page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Login authentication
app.post('/auth', (req, res) => {
    let { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Please enter Username and Password!');
    }

    connection.query('SELECT * FROM accounts WHERE username = ?', [username], (error, results) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).send('Internal Server Error');
        }

        if (results.length === 0) {
            return res.status(401).send('Incorrect Username and/or Password!');
        }

        const user = results[0];

        // Compare hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).send('Internal Server Error');
            }

            if (!isMatch) {
                return res.status(401).send('Incorrect Username and/or Password!');
            }

            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/landing');
        });
    });
});

// Landing page route
app.get('/landing', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'static', 'landing.html'));
    } else {
        res.redirect('/');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Fetch recent users
app.get('/users', (req, res) => {
    connection.query('SELECT id, username, email, role FROM accounts ORDER BY id DESC LIMIT 7', (error, results) => {
        if (error) {
            console.error("Error fetching users:", error);
            return res.status(500).send('Database Error');
        }
        res.json(results);
    });
});

// Add new user with hashed password
app.post('/add-user', async (req, res) => {
    const { username, email, role } = req.body;

    // Validate role
    const validRoles = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Generate a random password and hash it
    const generatedPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Insert new user into the database
    const query = 'INSERT INTO accounts (username, password, email, role) VALUES (?, ?, ?, ?)';
    const values = [username, hashedPassword, email, role];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error("Error executing query:", error);
            return res.status(500).json({ success: false, message: 'Error adding user' });
        } else {
            console.log("User added successfully:", results);
            sendEmail(email, username, generatedPassword); // Send email with the generated password
            res.status(200).json({ success: true, message: 'User added successfully' });
        }
    });
});

// Send email function
function sendEmail(email, username, password) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS,
        }
    });

    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Account Details',
        text: `Hello ${username},\n\nYour account has been created.\nUsername: ${username}\nPassword: ${password}\n\nLogin and change your password ASAP.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

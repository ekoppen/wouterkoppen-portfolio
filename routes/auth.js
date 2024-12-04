const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Zoek gebruiker
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Ongeldige inloggegevens' });
        }

        // Controleer wachtwoord
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Ongeldige inloggegevens' });
        }

        // Maak sessie aan
        req.session.userId = user._id;
        req.session.username = user.username;

        res.json({ 
            message: 'Succesvol ingelogd',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check auth status
router.get('/check', auth, (req, res) => {
    res.json({ 
        isAuthenticated: true,
        user: {
            id: req.session.userId,
            username: req.session.username
        }
    });
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Fout bij uitloggen' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Succesvol uitgelogd' });
    });
});

module.exports = router; 
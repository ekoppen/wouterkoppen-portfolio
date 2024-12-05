const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

        // Genereer JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Succesvol ingelogd',
            token,
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

// Verify token route
router.get('/verify', auth, (req, res) => {
    res.json({ valid: true });
});

// Check auth status route
router.get('/check', auth, (req, res) => {
    res.json({ 
        authenticated: true,
        user: {
            id: req.user.userId,
            username: req.user.username
        }
    });
});

module.exports = router; 
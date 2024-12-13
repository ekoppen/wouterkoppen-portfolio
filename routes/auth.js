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
        console.log('Login poging voor gebruiker:', username);

        // Zoek gebruiker
        const user = await User.findOne({ username });
        if (!user) {
            console.log('Gebruiker niet gevonden:', username);
            return res.status(401).json({ error: 'Ongeldige inloggegevens' });
        }
        console.log('Gebruiker gevonden:', { id: user._id, username: user.username, role: user.role });

        // Controleer wachtwoord met de verifyPassword methode
        console.log('Wachtwoord controleren...');
        const isValid = await user.verifyPassword(password);
        console.log('Wachtwoord controle resultaat:', isValid);
        
        if (!isValid) {
            console.log('Ongeldig wachtwoord voor gebruiker:', username);
            return res.status(401).json({ error: 'Ongeldige inloggegevens' });
        }

        // Update laatste login
        user.lastLogin = Date.now();
        await user.save();
        console.log('Laatste login bijgewerkt');

        // Genereer JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT token gegenereerd');

        res.json({
            message: 'Succesvol ingelogd',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
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
            username: req.user.username,
            role: req.user.role
        }
    });
});

module.exports = router; 
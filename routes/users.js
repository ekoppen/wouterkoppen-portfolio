const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Alle gebruikers ophalen
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Fout bij ophalen gebruikers' });
    }
});

// Nieuwe gebruiker aanmaken
router.post('/', auth, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check of gebruiker al bestaat
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Gebruikersnaam bestaat al' });
        }

        // Hash wachtwoord
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Maak nieuwe gebruiker
        const user = new User({
            username,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: 'Gebruiker succesvol aangemaakt',
            user: {
                id: user._id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Fout bij aanmaken gebruiker' });
    }
});

// Gebruiker verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        // Voorkom verwijderen van admin gebruiker
        if (user.username === 'admin') {
            return res.status(403).json({ error: 'Admin gebruiker kan niet worden verwijderd' });
        }

        await user.remove();
        res.json({ message: 'Gebruiker succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Fout bij verwijderen gebruiker' });
    }
});

// Wachtwoord resetten
router.post('/:id/reset-password', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        // Genereer tijdelijk wachtwoord
        const tempPassword = Math.random().toString(36).slice(-8);
        
        // Hash nieuw wachtwoord
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);
        
        user.password = hashedPassword;
        await user.save();

        res.json({ 
            message: 'Wachtwoord succesvol gereset',
            temporaryPassword: tempPassword
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Fout bij resetten wachtwoord' });
    }
});

module.exports = router; 
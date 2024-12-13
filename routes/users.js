const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Middleware om te controleren of gebruiker admin is
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Geen toegang. Admin rechten vereist.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Alle gebruikers ophalen (alleen admin)
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Fout bij ophalen gebruikers' });
    }
});

// Nieuwe gebruiker aanmaken (alleen admin)
router.post('/', auth, isAdmin, async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user.toJSON());
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Gebruikersnaam of email bestaat al' });
        }
        res.status(400).json({ error: 'Fout bij aanmaken gebruiker' });
    }
});

// Gebruiker bijwerken (alleen admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
    try {
        const updates = req.body;
        
        // Verwijder velden die niet bijgewerkt mogen worden
        delete updates.role; // Role changes via aparte endpoint
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Fout bij bijwerken gebruiker' });
    }
});

// Gebruikersrol wijzigen (alleen admin)
router.put('/:id/role', auth, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'editor', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'Ongeldige rol' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Fout bij wijzigen rol' });
    }
});

// Gebruiker activeren/deactiveren (alleen admin)
router.put('/:id/toggle-active', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json(user.toJSON());
    } catch (error) {
        res.status(400).json({ error: 'Fout bij activeren/deactiveren gebruiker' });
    }
});

// Wachtwoord wijzigen (gebruiker zelf of admin)
router.put('/:id/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        // Alleen admin mag wachtwoord van andere gebruikers wijzigen
        if (req.user.id !== user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Geen toegang' });
        }

        // Als het niet de admin is, verifieer het huidige wachtwoord
        if (req.user.role !== 'admin') {
            const isValid = await user.verifyPassword(currentPassword);
            if (!isValid) {
                return res.status(401).json({ error: 'Huidig wachtwoord is onjuist' });
            }
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Wachtwoord succesvol gewijzigd' });
    } catch (error) {
        res.status(400).json({ error: 'Fout bij wijzigen wachtwoord' });
    }
});

// Gebruiker verwijderen (alleen admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        res.json({ message: 'Gebruiker succesvol verwijderd' });
    } catch (error) {
        res.status(500).json({ error: 'Fout bij verwijderen gebruiker' });
    }
});

module.exports = router; 
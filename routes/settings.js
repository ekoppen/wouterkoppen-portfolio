const express = require('express');
const router = express.Router();
const Settings = require('../models/settings');
const auth = require('../middleware/auth');

// Haal instellingen op
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Fout bij ophalen instellingen' });
    }
});

// Update instellingen (alleen voor admins)
router.put('/', auth, async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        
        // Update alleen de velden die zijn meegestuurd
        Object.keys(req.body).forEach(key => {
            if (settings.schema.paths[key]) {
                settings[key] = req.body[key];
            }
        });

        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Fout bij updaten instellingen' });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const Theme = require('../models/Theme');
const auth = require('../middleware/auth');

// Alle thema's ophalen
router.get('/', auth, async (req, res) => {
    try {
        const themes = await Theme.find();
        res.json(themes);
    } catch (error) {
        res.status(500).json({ error: 'Fout bij ophalen thema\'s' });
    }
});

// Actief thema ophalen
router.get('/active', auth, async (req, res) => {
    try {
        const activeTheme = await Theme.findOne({ isActive: true });
        if (!activeTheme) {
            return res.status(404).json({ error: 'Geen actief thema gevonden' });
        }
        res.json(activeTheme);
    } catch (error) {
        res.status(500).json({ error: 'Fout bij ophalen actief thema' });
    }
});

// Nieuw thema aanmaken (alleen admin)
router.post('/', auth, async (req, res) => {
    try {
        const theme = new Theme(req.body);
        await theme.save();
        res.status(201).json(theme);
    } catch (error) {
        res.status(400).json({ error: 'Fout bij aanmaken thema' });
    }
});

// Thema bijwerken (alleen admin)
router.put('/:id', auth, async (req, res) => {
    try {
        const theme = await Theme.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!theme) {
            return res.status(404).json({ error: 'Thema niet gevonden' });
        }
        res.json(theme);
    } catch (error) {
        res.status(400).json({ error: 'Fout bij bijwerken thema' });
    }
});

// Thema activeren (alleen admin)
router.post('/:id/activate', auth, async (req, res) => {
    try {
        // Deactiveer het huidige actieve thema
        await Theme.updateMany({}, { isActive: false });
        
        // Activeer het nieuwe thema
        const theme = await Theme.findByIdAndUpdate(
            req.params.id,
            { isActive: true },
            { new: true }
        );
        
        if (!theme) {
            return res.status(404).json({ error: 'Thema niet gevonden' });
        }
        
        res.json(theme);
    } catch (error) {
        res.status(400).json({ error: 'Fout bij activeren thema' });
    }
});

// Thema verwijderen (alleen admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const theme = await Theme.findByIdAndDelete(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: 'Thema niet gevonden' });
        }
        res.json({ message: 'Thema succesvol verwijderd' });
    } catch (error) {
        res.status(500).json({ error: 'Fout bij verwijderen thema' });
    }
});

module.exports = router; 
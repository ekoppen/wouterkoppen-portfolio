const express = require('express');
const router = express.Router();
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

// Alle foto's ophalen
router.get('/', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ order: 1 });
        res.json(photos);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Foto metadata ophalen - moet voor de /:id route komen
router.get('/:id/metadata', auth, async (req, res) => {
    try {
        console.log('Metadata opgevraagd voor foto:', req.params.id);
        const photo = await Photo.findById(req.params.id);
        
        if (!photo) {
            console.log('Foto niet gevonden:', req.params.id);
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }

        console.log('Foto gevonden, metadata:', {
            width: photo.width,
            height: photo.height,
            hasExif: !!photo.exif
        });

        // Converteer de EXIF data naar een gewoon object als het een Map is
        let exifData = photo.exif;
        if (photo.exif instanceof Map) {
            exifData = Object.fromEntries(photo.exif);
        }

        // Stuur de metadata terug
        res.json({
            width: photo.width,
            height: photo.height,
            size: photo.size,
            format: photo.mimetype.split('/')[1],
            exif: exifData
        });
    } catch (error) {
        console.error('Error bij ophalen metadata:', error);
        res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Foto op ID ophalen
router.get('/:id', async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }
        res.json(photo);
    } catch (error) {
        console.error('Error fetching photo:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Foto bijwerken
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const photo = await Photo.findByIdAndUpdate(
            req.params.id,
            { title, description, category },
            { new: true }
        );
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }
        res.json(photo);
    } catch (error) {
        console.error('Error updating photo:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Foto verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        // Zoek eerst de foto
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }

        // Verwijder het bestand
        if (photo.path) {
            const filePath = path.join(process.cwd(), 'public', photo.path);
            try {
                await fs.unlink(filePath);
                console.log('Bestand verwijderd:', filePath);
            } catch (err) {
                // Log de error maar ga door met verwijderen van database entry
                console.error('Error deleting file:', err);
            }
        }

        // Verwijder de database entry
        await Photo.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Foto succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Server error bij verwijderen foto' });
    }
});

// Foto volgorde aanpassen
router.put('/reorder', auth, async (req, res) => {
    try {
        const { photoIds } = req.body;
        
        // Update de volgorde van alle foto's
        for (let i = 0; i < photoIds.length; i++) {
            await Photo.findByIdAndUpdate(photoIds[i], { order: i });
        }
        
        res.json({ message: 'Volgorde succesvol bijgewerkt' });
    } catch (error) {
        console.error('Error reordering photos:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 
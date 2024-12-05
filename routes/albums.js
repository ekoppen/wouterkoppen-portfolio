const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const auth = require('../middleware/auth');

// Alle albums ophalen
router.get('/', auth, async (req, res) => {
    try {
        const albums = await Album.find().populate('photos');
        res.json(albums);
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ error: 'Fout bij ophalen van albums' });
    }
});

// Nieuw album aanmaken
router.post('/', auth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Titel is verplicht' });
        }

        const album = new Album({ title });
        await album.save();
        res.status(201).json(album);
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).json({ error: 'Fout bij maken van album' });
    }
});

// Album bijwerken
router.put('/:id', auth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Titel is verplicht' });
        }

        const album = await Album.findByIdAndUpdate(
            req.params.id,
            { title },
            { new: true }
        );

        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        res.json(album);
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ error: 'Fout bij bijwerken van album' });
    }
});

// Album verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        const album = await Album.findByIdAndDelete(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }
        res.json({ message: 'Album succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ error: 'Fout bij verwijderen van album' });
    }
});

// Foto's toevoegen aan album
router.post('/:id/photos', auth, async (req, res) => {
    try {
        const { photoIds } = req.body;
        if (!photoIds || !Array.isArray(photoIds)) {
            return res.status(400).json({ error: 'Foto IDs zijn verplicht' });
        }

        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        // Voeg nieuwe foto's toe en verwijder duplicaten
        const uniquePhotos = new Set([...album.photos.map(p => p.toString()), ...photoIds]);
        album.photos = Array.from(uniquePhotos);
        
        await album.save();
        
        // Haal het bijgewerkte album op met foto details
        const updatedAlbum = await Album.findById(req.params.id).populate('photos');
        res.json(updatedAlbum);
    } catch (error) {
        console.error('Error adding photos to album:', error);
        res.status(500).json({ error: 'Fout bij toevoegen van foto\'s aan album' });
    }
});

// Foto's verwijderen uit album
router.delete('/:id/photos', auth, async (req, res) => {
    try {
        const { photoIds } = req.body;
        if (!photoIds || !Array.isArray(photoIds)) {
            return res.status(400).json({ error: 'Foto IDs zijn verplicht' });
        }

        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        album.photos = album.photos.filter(p => !photoIds.includes(p.toString()));
        await album.save();
        
        // Haal het bijgewerkte album op met foto details
        const updatedAlbum = await Album.findById(req.params.id).populate('photos');
        res.json(updatedAlbum);
    } catch (error) {
        console.error('Error removing photos from album:', error);
        res.status(500).json({ error: 'Fout bij verwijderen van foto\'s uit album' });
    }
});

module.exports = router; 
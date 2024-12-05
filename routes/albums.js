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

// Specifiek album ophalen met foto's
router.get('/:id', auth, async (req, res) => {
    try {
        const album = await Album.findById(req.params.id).populate('photos');
        
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        res.json(album);
    } catch (error) {
        console.error('Error fetching album:', error);
        res.status(500).json({ error: 'Fout bij ophalen van album' });
    }
});

// Foto's van een album ophalen
router.get('/:id/photos', auth, async (req, res) => {
    try {
        const album = await Album.findById(req.params.id).populate('photos');
        
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        res.json(album.photos);
    } catch (error) {
        console.error('Error fetching album photos:', error);
        res.status(500).json({ error: 'Fout bij ophalen van foto\'s' });
    }
});

// Foto aan album toevoegen
router.post('/:id/photos', auth, async (req, res) => {
    try {
        const { photoId } = req.body;
        const album = await Album.findById(req.params.id);
        
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        if (!album.photos.includes(photoId)) {
            album.photos.push(photoId);
            await album.save();
        }

        res.json(album);
    } catch (error) {
        console.error('Error adding photo to album:', error);
        res.status(500).json({ error: 'Fout bij toevoegen van foto aan album' });
    }
});

// Foto uit album verwijderen
router.delete('/:id/photos/:photoId', auth, async (req, res) => {
    try {
        const album = await Album.findById(req.params.id);
        
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        album.photos = album.photos.filter(id => id.toString() !== req.params.photoId);
        await album.save();

        res.json(album);
    } catch (error) {
        console.error('Error removing photo from album:', error);
        res.status(500).json({ error: 'Fout bij verwijderen van foto uit album' });
    }
});

// Foto's in album herordenen
router.put('/:id/photos/reorder', auth, async (req, res) => {
    try {
        const { photoIds } = req.body;
        const album = await Album.findById(req.params.id);
        
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        album.photos = photoIds;
        await album.save();

        res.json(album);
    } catch (error) {
        console.error('Error reordering photos:', error);
        res.status(500).json({ error: 'Fout bij herordenen van foto\'s' });
    }
});

module.exports = router; 
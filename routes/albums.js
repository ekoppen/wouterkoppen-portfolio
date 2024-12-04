const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const auth = require('../middleware/auth');

// Alle albums ophalen
router.get('/', auth, async (req, res) => {
    try {
        const albums = await Album.find().populate('photos coverPhoto').sort('order');
        res.json(albums);
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ error: 'Fout bij ophalen albums' });
    }
});

// Specifiek album ophalen
router.get('/:id', auth, async (req, res) => {
    try {
        const album = await Album.findById(req.params.id).populate('photos coverPhoto');
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }
        res.json(album);
    } catch (error) {
        console.error('Error fetching album:', error);
        res.status(500).json({ error: 'Fout bij ophalen album' });
    }
});

// Nieuw album aanmaken
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, photos } = req.body;
        
        const lastAlbum = await Album.findOne().sort('-order');
        const order = lastAlbum ? lastAlbum.order + 1 : 0;
        
        const album = new Album({
            title,
            description,
            photos,
            order,
            coverPhoto: photos && photos.length > 0 ? photos[0] : null
        });
        
        await album.save();
        
        const populatedAlbum = await Album.findById(album._id).populate('photos coverPhoto');
        res.status(201).json(populatedAlbum);
    } catch (error) {
        console.error('Error creating album:', error);
        res.status(500).json({ error: 'Fout bij aanmaken album' });
    }
});

// Album bijwerken
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, description, photos } = req.body;
        
        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }
        
        album.title = title;
        album.description = description;
        album.photos = photos;
        album.coverPhoto = photos && photos.length > 0 ? photos[0] : null;
        
        await album.save();
        
        const populatedAlbum = await Album.findById(album._id).populate('photos coverPhoto');
        res.json(populatedAlbum);
    } catch (error) {
        console.error('Error updating album:', error);
        res.status(500).json({ error: 'Fout bij bijwerken album' });
    }
});

// Album verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }
        
        await album.remove();
        res.json({ message: 'Album succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting album:', error);
        res.status(500).json({ error: 'Fout bij verwijderen album' });
    }
});

// Foto volgorde bijwerken
router.put('/:id/reorder', auth, async (req, res) => {
    try {
        const { photoIds } = req.body;
        
        const album = await Album.findById(req.params.id);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }
        
        album.photos = photoIds;
        await album.save();
        
        const populatedAlbum = await Album.findById(album._id).populate('photos coverPhoto');
        res.json(populatedAlbum);
    } catch (error) {
        console.error('Error reordering photos:', error);
        res.status(500).json({ error: 'Fout bij updaten foto volgorde' });
    }
});

module.exports = router; 
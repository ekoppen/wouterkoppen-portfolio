const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Herorden albums (moet voor andere routes komen vanwege route matching)
router.put('/reorder', auth, async (req, res) => {
    try {
        const { albumIds } = req.body;
        
        // Valideer input
        if (!Array.isArray(albumIds)) {
            return res.status(400).json({ error: 'Ongeldige albumvolgorde' });
        }

        // Haal het home album op
        const homeAlbum = await Album.findOne({ title: /^home$/i });
        if (homeAlbum && albumIds[0] !== homeAlbum._id.toString()) {
            return res.status(400).json({ error: 'Home album moet als eerste staan' });
        }

        // Update de volgorde van alle albums
        const updatePromises = albumIds.map((id, index) => {
            return Album.findByIdAndUpdate(id, { order: index }, { new: true });
        });

        await Promise.all(updatePromises);

        // Haal de bijgewerkte albums op
        const updatedAlbums = await Album.find()
            .populate('photos')
            .sort('order title')
            .exec();

        res.json(updatedAlbums);
    } catch (error) {
        console.error('Error reordering albums:', error);
        res.status(500).json({ error: 'Fout bij herordenen van albums' });
    }
});

// Alle albums ophalen
router.get('/', async (req, res) => {
    try {
        const albums = await Album.find()
            .populate('photos')
            .sort('order title')
            .exec();
        
        res.json(albums);
    } catch (error) {
        console.error('Error fetching albums:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Specifiek album ophalen
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

// Foto's herordenen in album
router.put('/:id/reorder', auth, async (req, res) => {
    try {
        const { id: albumId } = req.params;
        const { photoIds } = req.body;

        console.log('Reordering photos for album:', albumId);
        console.log('New photo order:', photoIds);

        // Valideer albumId
        if (!mongoose.Types.ObjectId.isValid(albumId)) {
            console.log('Invalid album ID format:', albumId);
            return res.status(400).json({ error: 'Ongeldig album ID formaat' });
        }

        // Valideer photoIds
        if (!photoIds || !Array.isArray(photoIds)) {
            console.log('Invalid photoIds:', photoIds);
            return res.status(400).json({ error: 'Ongeldige foto volgorde' });
        }

        // Valideer dat alle photoIds geldig ObjectIds zijn
        const validPhotoIds = photoIds.every(id => mongoose.Types.ObjectId.isValid(id));
        if (!validPhotoIds) {
            console.log('Invalid photo ID format in array');
            return res.status(400).json({ error: 'Ongeldig foto ID formaat' });
        }

        // Zoek het album en log het resultaat
        const album = await Album.findById(albumId);
        console.log('Found album:', album);

        if (!album) {
            console.log('Album not found:', albumId);
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        // Log de huidige staat
        console.log('Current album photos:', album.photos);
        console.log('Requested photo order:', photoIds);

        // Converteer huidige foto IDs naar strings voor vergelijking
        const currentPhotoIds = album.photos.map(id => id.toString());
        console.log('Current photo IDs as strings:', currentPhotoIds);

        // Controleer of alle aangevraagde foto's in het album zitten
        const missingPhotos = photoIds.filter(id => !currentPhotoIds.includes(id));
        if (missingPhotos.length > 0) {
            console.log('Missing photos:', missingPhotos);
            return res.status(400).json({ 
                error: 'Niet alle foto\'s behoren tot dit album',
                details: `Ontbrekende foto's: ${missingPhotos.join(', ')}`
            });
        }

        // Update het album met de nieuwe volgorde
        try {
            album.photos = photoIds.map(id => new mongoose.Types.ObjectId(id));
            await album.save();
            console.log('Successfully saved new order');
        } catch (saveError) {
            console.error('Error saving album:', saveError);
            throw saveError;
        }

        // Haal het bijgewerkte album op met foto informatie
        const updatedAlbum = await Album.findById(albumId).populate('photos');
        console.log('Successfully reordered photos');
        res.json(updatedAlbum);
    } catch (error) {
        console.error('Error in reorder route:', error);
        res.status(500).json({ 
            error: 'Fout bij herordenen van foto\'s',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Foto toevoegen aan album
router.put('/:albumId/photos/:photoId', auth, async (req, res) => {
    try {
        const { albumId, photoId } = req.params;
        
        const album = await Album.findById(albumId);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        // Check of de foto al in het album zit door de strings te vergelijken
        const photoExists = album.photos.some(id => id.toString() === photoId);
        if (!photoExists) {
            album.photos.push(photoId);
            await album.save();
        }

        // Stuur het bijgewerkte album terug met foto informatie
        const updatedAlbum = await Album.findById(albumId).populate('photos');
        res.json(updatedAlbum);
    } catch (error) {
        console.error('Error adding photo to album:', error);
        res.status(500).json({ error: 'Fout bij toevoegen van foto aan album' });
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
        const { title, description } = req.body;
        const updateData = {};
        
        // Voeg velden toe aan updateData als ze aanwezig zijn
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        
        // Check of er iets te updaten is
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Geen data om bij te werken' });
        }

        const album = await Album.findByIdAndUpdate(
            req.params.id,
            updateData,
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

// Haal album op basis van naam
router.get('/by-name/:name', async (req, res) => {
    try {
        const album = await Album.findOne({ 
            title: new RegExp('^' + req.params.name + '$', 'i')
        }).populate('photos');
        
        if (!album) {
            return res.status(404).json({ message: 'Album niet gevonden' });
        }
        
        res.json(album);
    } catch (error) {
        console.error('Error getting album by name:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 
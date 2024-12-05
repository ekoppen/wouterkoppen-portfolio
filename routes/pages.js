const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Page = require('../models/Page');
const Album = require('../models/Album');

// Alle pagina's ophalen
router.get('/', auth, async (req, res) => {
    try {
        const pages = await Page.find()
            .populate({
                path: 'albums',
                populate: {
                    path: 'photos',
                    options: { limit: 1 } // Alleen eerste foto voor preview
                }
            })
            .sort('order');
        res.json(pages);
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).json({ error: 'Fout bij ophalen van pagina\'s' });
    }
});

// Nieuwe pagina aanmaken
router.post('/', auth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Titel is verplicht' });
        }

        // Bepaal de hoogste order waarde
        const lastPage = await Page.findOne().sort('-order');
        const order = lastPage ? lastPage.order + 1 : 0;

        const page = new Page({
            title,
            order
        });

        await page.save();
        res.status(201).json(page);
    } catch (error) {
        console.error('Error creating page:', error);
        res.status(500).json({ error: 'Fout bij aanmaken van pagina' });
    }
});

// Pagina bijwerken
router.put('/:id', auth, async (req, res) => {
    try {
        const { title, albums, order } = req.body;
        const page = await Page.findById(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Pagina niet gevonden' });
        }

        if (title) page.title = title;
        if (albums) page.albums = albums;
        if (typeof order === 'number') page.order = order;

        await page.save();
        res.json(page);
    } catch (error) {
        console.error('Error updating page:', error);
        res.status(500).json({ error: 'Fout bij bijwerken van pagina' });
    }
});

// Pagina verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        const page = await Page.findById(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Pagina niet gevonden' });
        }

        await page.remove();
        res.json({ message: 'Pagina succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting page:', error);
        res.status(500).json({ error: 'Fout bij verwijderen van pagina' });
    }
});

// Album aan pagina toevoegen
router.post('/:id/albums', auth, async (req, res) => {
    try {
        const { albumId } = req.body;
        const page = await Page.findById(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Pagina niet gevonden' });
        }

        const album = await Album.findById(albumId);
        if (!album) {
            return res.status(404).json({ error: 'Album niet gevonden' });
        }

        if (!page.albums.includes(albumId)) {
            page.albums.push(albumId);
            await page.save();
        }

        res.json(page);
    } catch (error) {
        console.error('Error adding album to page:', error);
        res.status(500).json({ error: 'Fout bij toevoegen van album aan pagina' });
    }
});

// Album van pagina verwijderen
router.delete('/:id/albums/:albumId', auth, async (req, res) => {
    try {
        const page = await Page.findById(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Pagina niet gevonden' });
        }

        page.albums = page.albums.filter(id => id.toString() !== req.params.albumId);
        await page.save();

        res.json(page);
    } catch (error) {
        console.error('Error removing album from page:', error);
        res.status(500).json({ error: 'Fout bij verwijderen van album van pagina' });
    }
});

// Albums in pagina herordenen
router.put('/:id/albums/reorder', auth, async (req, res) => {
    try {
        const { albumIds } = req.body;
        const page = await Page.findById(req.params.id);
        
        if (!page) {
            return res.status(404).json({ error: 'Pagina niet gevonden' });
        }

        // Controleer of alle albumIds geldig zijn
        const validAlbums = await Album.find({ _id: { $in: albumIds } });
        if (validAlbums.length !== albumIds.length) {
            return res.status(400).json({ error: 'Ongeldige album IDs' });
        }

        page.albums = albumIds;
        await page.save();

        res.json(page);
    } catch (error) {
        console.error('Error reordering albums:', error);
        res.status(500).json({ error: 'Fout bij herordenen van albums' });
    }
});

module.exports = router; 
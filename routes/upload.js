const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');
const Album = require('../models/Album');

// Configureer multer voor foto uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads';
        // Maak upload directory als deze niet bestaat
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Genereer unieke bestandsnaam
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limiet
    },
    fileFilter: (req, file, cb) => {
        // Accepteer alleen afbeeldingen
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Alleen afbeeldingen zijn toegestaan'));
        }
        cb(null, true);
    }
});

// Alle foto's ophalen
router.get('/', auth, async (req, res) => {
    try {
        const photos = await Photo.find().sort({ createdAt: -1 });
        
        // Zoek voor elke foto het bijbehorende album
        const photosWithAlbums = await Promise.all(photos.map(async (photo) => {
            const album = await Album.findOne({ photos: photo._id });
            return {
                ...photo.toObject(),
                album: album ? { _id: album._id, title: album.title } : null
            };
        }));
        
        res.json(photosWithAlbums);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).json({ error: 'Fout bij ophalen foto\'s' });
    }
});

// Upload route
router.post('/', auth, upload.array('photos', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Geen bestanden geüpload' });
        }

        const uploadedPhotos = [];
        for (const file of req.files) {
            const photo = new Photo({
                title: file.originalname || '',
                description: '',
                path: `/uploads/${file.filename}`,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size
            });
            await photo.save();
            uploadedPhotos.push(photo);
        }

        res.status(201).json(uploadedPhotos);
    } catch (error) {
        console.error('Upload error:', error);
        // Verwijder geüploade bestanden bij error
        if (req.files) {
            for (const file of req.files) {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
        }
        res.status(500).json({ error: 'Fout bij uploaden foto\'s' });
    }
});

// Foto bewerken
router.put('/:id', auth, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Titel is verplicht' });
        }

        const photo = await Photo.findByIdAndUpdate(
            req.params.id,
            { title },
            { new: true }
        );

        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }

        res.json(photo);
    } catch (error) {
        console.error('Error updating photo:', error);
        res.status(500).json({ error: 'Fout bij bijwerken van foto' });
    }
});

// Foto verwijderen
router.delete('/:id', auth, async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }

        // Verwijder bestand
        const filePath = path.join('public', photo.path);
        try {
            await fs.promises.unlink(filePath);
        } catch (err) {
            console.error('Error deleting file:', err);
            // Ga door met verwijderen van database entry zelfs als bestand niet gevonden wordt
            if (err.code !== 'ENOENT') {
                return res.status(500).json({ error: 'Fout bij verwijderen bestand' });
            }
        }

        // Verwijder database entry
        await Photo.findByIdAndDelete(photo._id);
        res.json({ message: 'Foto succesvol verwijderd' });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Fout bij verwijderen foto' });
    }
});

module.exports = router; 
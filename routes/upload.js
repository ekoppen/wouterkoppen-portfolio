const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');

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
        fileSize: 5 * 1024 * 1024 // 5MB limiet
    },
    fileFilter: (req, file, cb) => {
        // Accepteer alleen afbeeldingen
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Alleen afbeeldingen zijn toegestaan'));
        }
        cb(null, true);
    }
});

// Upload route
router.post('/', auth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Geen bestand geüpload' });
        }

        // Maak nieuw foto document
        const photo = new Photo({
            title: req.body.title || '',
            description: req.body.description || '',
            path: `/uploads/${req.file.filename}`,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        await photo.save();
        res.status(201).json(photo);
    } catch (error) {
        console.error('Upload error:', error);
        // Verwijder geüpload bestand bij error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        res.status(500).json({ error: 'Fout bij uploaden foto' });
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
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                // Ga door met verwijderen van database entry zelfs als bestand niet gevonden wordt
                if (err.code !== 'ENOENT') {
                    return res.status(500).json({ error: 'Fout bij verwijderen bestand' });
                }
            }

            // Verwijder database entry
            await photo.remove();
            res.json({ message: 'Foto succesvol verwijderd' });
        });
    } catch (error) {
        console.error('Error deleting photo:', error);
        res.status(500).json({ error: 'Fout bij verwijderen foto' });
    }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ExifReader = require('exifreader');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');
const Album = require('../models/Album');

// Configureer multer voor foto uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads';
        const thumbsDir = 'public/uploads/thumbs';
        // Maak upload directories als deze niet bestaan
        [uploadDir, thumbsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
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

// Functie om thumbnail te genereren
async function generateThumbnail(file) {
    const thumbPath = path.join('public/uploads/thumbs', file.filename);
    await sharp(file.path)
        .resize(300, 300, {
            fit: 'cover',
            position: 'center'
        })
        .toFile(thumbPath);
    return '/uploads/thumbs/' + file.filename;
}

// Functie om EXIF data te verwerken
async function extractExifData(filePath) {
    try {
        // Lees het bestand als buffer
        const imageBuffer = await fs.promises.readFile(filePath);
        
        // Lees EXIF data met ExifReader
        const tags = ExifReader.load(imageBuffer);
        
        console.log('Ruwe EXIF tags:', tags);

        const exifData = {};

        // Map de EXIF tags naar ons formaat
        if (tags) {
            // Basis afbeeldingsinformatie
            if (tags['Image Height']) exifData.ImageHeight = tags['Image Height'].value;
            if (tags['Image Width']) exifData.ImageWidth = tags['Image Width'].value;
            if (tags['Color Components']) exifData.ColorComponents = tags['Color Components'].value;
            if (tags['Bits Per Sample']) exifData.BitsPerSample = tags['Bits Per Sample'].value;
            if (tags['Resolution Unit']) exifData.ResolutionUnit = tags['Resolution Unit'].description;
            if (tags.XResolution) exifData.XResolution = tags.XResolution.value;
            if (tags.YResolution) exifData.YResolution = tags.YResolution.value;
            if (tags.FileType) exifData.FileType = tags.FileType.description;
            if (tags.Subsampling) exifData.Subsampling = tags.Subsampling.description;

            // Camera info (als beschikbaar)
            if (tags.Make) exifData.Make = tags.Make.description;
            if (tags.Model) exifData.Model = tags.Model.description;
            
            // Lens info (als beschikbaar)
            if (tags.LensModel) exifData.LensModel = tags.LensModel.description;
            if (tags.LensMake) exifData.LensMake = tags.LensMake.description;
            
            // Exposure info (als beschikbaar)
            if (tags.ExposureTime) exifData.ExposureTime = tags.ExposureTime.value[0];
            if (tags.FNumber) exifData.FNumber = tags.FNumber.value;
            if (tags.ISOSpeedRatings) exifData.ISO = tags.ISOSpeedRatings.value;
            if (tags.FocalLength) exifData.FocalLength = tags.FocalLength.value;
            
            // Date info (als beschikbaar)
            if (tags.DateTimeOriginal) exifData.DateTimeOriginal = tags.DateTimeOriginal.description;
            
            // GPS info (als beschikbaar)
            if (tags.GPSLatitude && tags.GPSLatitudeRef) {
                const lat = tags.GPSLatitude.value;
                const latRef = tags.GPSLatitudeRef.value;
                exifData.GPSLatitude = latRef === 'N' ? lat : -lat;
            }
            if (tags.GPSLongitude && tags.GPSLongitudeRef) {
                const lon = tags.GPSLongitude.value;
                const lonRef = tags.GPSLongitudeRef.value;
                exifData.GPSLongitude = lonRef === 'E' ? lon : -lon;
            }
        }

        console.log('Geëxtraheerde EXIF data:', exifData);
        
        // Return de data als er tenminste één veld is
        return Object.keys(exifData).length > 0 ? exifData : null;
    } catch (error) {
        console.error('Error bij EXIF extractie:', error);
        return null;
    }
}

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

        console.log('Start verwerken van', req.files.length, 'foto(s)');
        const uploadedPhotos = [];
        
        for (const file of req.files) {
            try {
                console.log('Verwerken van bestand:', file.originalname);
                
                // Lees metadata en EXIF data
                const metadata = await sharp(file.path).metadata();
                console.log('Basis metadata gelezen:', {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format
                });
                
                // Genereer thumbnail
                const thumbPath = await generateThumbnail(file);
                console.log('Thumbnail gegenereerd:', thumbPath);
                
                // Haal EXIF data op
                const exifData = await extractExifData(file.path);
                console.log('EXIF data geëxtraheerd:', exifData);
                
                const photo = new Photo({
                    title: file.originalname || '',
                    description: '',
                    path: `/uploads/${file.filename}`,
                    thumbPath: thumbPath,
                    filename: file.filename,
                    mimetype: file.mimetype,
                    size: file.size,
                    width: metadata.width,
                    height: metadata.height,
                    exif: exifData
                });
                
                console.log('Foto object aangemaakt met EXIF:', photo.exif);
                await photo.save();
                console.log('Foto succesvol opgeslagen in database');
                
                uploadedPhotos.push(photo);
            } catch (error) {
                console.error('Error bij verwerken bestand:', file.originalname, error);
                // Verwijder het bestand bij een error
                try {
                    await fs.promises.unlink(file.path);
                    console.log('Origineel bestand verwijderd na error');
                    
                    const thumbPath = path.join('public/uploads/thumbs', file.filename);
                    if (fs.existsSync(thumbPath)) {
                        await fs.promises.unlink(thumbPath);
                        console.log('Thumbnail verwijderd na error');
                    }
                } catch (cleanupError) {
                    console.error('Error bij opruimen bestanden:', cleanupError);
                }
                
                throw error;
            }
        }

        console.log('Alle foto\'s succesvol verwerkt');
        res.status(201).json(uploadedPhotos);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Fout bij uploaden foto\'s',
            details: error.message 
        });
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
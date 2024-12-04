const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connectie
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/portfolio';
console.log('Connecting to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true
}).then(() => {
    console.log('MongoDB verbinding succesvol');
}).catch(err => {
    console.error('MongoDB verbinding mislukt:', err);
});

// Schema's
const PhotoSchema = new mongoose.Schema({
    filename: String,
    path: String,
    title: String,
    description: String,
    category: String,
    order: Number,
    createdAt: { type: Date, default: Date.now }
});

const Photo = mongoose.model('Photo', PhotoSchema);

// Multer configuratie
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadsDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Alleen afbeeldingen zijn toegestaan'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// API Routes
app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Geen bestand geüpload');
        }

        const photo = new Photo({
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            title: req.body.title || '',
            description: req.body.description || '',
            category: req.body.category || '',
            order: 0
        });

        await photo.save();
        res.json(photo);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/photos', async (req, res) => {
    try {
        const photos = await Photo.find().sort({ order: 1, createdAt: -1 });
        res.json(photos);
    } catch (error) {
        console.error('Photos fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/photos/:id', async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }
        res.json(photo);
    } catch (error) {
        console.error('Photo fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/photos/:id', async (req, res) => {
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
        console.error('Photo update error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/photos/:id', async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);
        if (!photo) {
            return res.status(404).json({ error: 'Foto niet gevonden' });
        }

        // Verwijder het bestand
        const filePath = path.join(__dirname, 'public', photo.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Verwijder de database entry
        await Photo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Foto succesvol verwijderd' });
    } catch (error) {
        console.error('Photo delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/photos/reorder', async (req, res) => {
    try {
        const updates = req.body.updates;
        for (let update of updates) {
            await Photo.findByIdAndUpdate(update.id, { order: update.order });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// HTML Routes
app.get(['/', '/admin'], (req, res) => {
    const route = req.path;
    const filePath = route === '/admin' ? 'admin.html' : 'index.html';
    res.sendFile(path.join(__dirname, 'public', filePath));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Bestand is te groot (max 5MB)' });
        }
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Er is iets misgegaan!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
}); 
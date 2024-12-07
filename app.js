const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connectie
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/pages', require('./routes/pages'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/photos', require('./routes/upload'));
app.use('/api/themes', require('./routes/themes'));
app.use('/api/auth', require('./routes/auth'));

// Frontend routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route voor client-side routing
app.get('*', (req, res) => {
    // Controleer of het een API route is
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint niet gevonden' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
});

module.exports = app; 
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// MongoDB verbinding
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB verbinding succesvol');
    createAdminUser(); // Maak admin gebruiker aan als deze nog niet bestaat
}).catch(err => {
    console.error('MongoDB verbinding mislukt:', err);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische bestanden
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const albumRoutes = require('./routes/albums');

app.use('/api/auth', authRoutes);
app.use('/api/photos', uploadRoutes);
app.use('/api/albums', albumRoutes);

// Admin gebruiker aanmaken als deze nog niet bestaat
async function createAdminUser() {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin', salt);
            
            const admin = new User({
                username: 'admin',
                password: hashedPassword
            });
            
            await admin.save();
            console.log('Admin gebruiker aangemaakt');
        }
    } catch (error) {
        console.error('Fout bij aanmaken admin gebruiker:', error);
    }
}

// Frontend routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Alle andere routes naar index.html (voor client-side routing)
app.get('*', (req, res) => {
    // Stuur geen index.html voor API routes
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Er is iets misgegaan!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op poort ${PORT}`);
}); 
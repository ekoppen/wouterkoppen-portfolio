const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Theme = require('./models/Theme');

const app = express();

// Admin gebruiker aanmaken als deze nog niet bestaat
async function createAdminUser() {
    try {
        const username = 'admin';
        const email = 'admin@wouterkoppen.nl';
        const password = 'admin123';

        // Controleer of admin gebruiker al bestaat
        const adminExists = await User.findOne({ username });
        if (!adminExists) {
            // Hash het wachtwoord
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            console.log('Nieuw wachtwoord hash:', hashedPassword);
            
            // Maak de admin gebruiker aan
            const admin = new User({
                username,
                email,
                password: hashedPassword,
                role: 'admin'
            });
            
            await admin.save();
            console.log('Admin gebruiker aangemaakt met hash:', hashedPassword);
        } else {
            // Update het wachtwoord van de bestaande admin gebruiker
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            console.log('Bijgewerkt wachtwoord hash:', hashedPassword);
            
            adminExists.password = hashedPassword;
            await adminExists.save();
            console.log('Admin wachtwoord bijgewerkt met hash:', hashedPassword);
        }
    } catch (error) {
        console.error('Fout bij aanmaken admin gebruiker:', error);
        if (error.errors) {
            console.error('Validation errors:', error.errors);
        }
    }
}

// MongoDB verbinding
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB verbinding succesvol');
    createAdminUser(); // Maak admin gebruiker aan als deze nog niet bestaat
    createDefaultTheme(); // Maak standaard thema aan als er nog geen actief thema is
}).catch(err => {
    console.error('MongoDB verbinding mislukt:', err);
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Statische bestanden
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const albumRoutes = require('./routes/albums');
const pageRoutes = require('./routes/pages');
const themeRoutes = require('./routes/themes');
const photoRoutes = require('./routes/photos');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/settings', settingsRoutes);

// Standaard thema aanmaken als er nog geen actief thema is
async function createDefaultTheme() {
    try {
        const activeTheme = await Theme.findOne({ isActive: true });
        if (!activeTheme) {
            const defaultTheme = new Theme({
                name: 'Standaard Thema',
                isActive: true,
                colors: {
                    primary: '#007bff',
                    secondary: '#6c757d',
                    success: '#28a745',
                    danger: '#dc3545',
                    warning: '#ffc107',
                    info: '#17a2b8',
                    white: '#ffffff',
                    gray100: '#f8f9fa',
                    gray200: '#e9ecef',
                    gray300: '#dee2e6',
                    gray400: '#ced4da',
                    gray500: '#adb5bd',
                    gray600: '#6c757d',
                    gray700: '#495057',
                    gray800: '#343a40',
                    gray900: '#212529',
                    black: '#000000'
                }
            });
            
            await defaultTheme.save();
            console.log('Standaard thema aangemaakt');
        }
    } catch (error) {
        console.error('Fout bij aanmaken standaard thema:', error);
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
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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

// Sessie configuratie
app.use(session({
    secret: process.env.SESSION_SECRET || 'een-zeer-geheim-wachtwoord',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 dag
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 dag
    }
}));

// Statische bestanden
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/albums', require('./routes/albums'));

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

// HTML routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve SPA voor overige routes
app.get('*', (req, res) => {
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
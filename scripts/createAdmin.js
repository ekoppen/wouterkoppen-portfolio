const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createAdminUser() {
    try {
        // Verbind met de database
        await mongoose.connect('mongodb://mongodb:27017/portfolio', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Verwijder bestaande admin gebruiker
        await User.deleteOne({ username: 'admin' });

        // Test directe bcrypt hash
        const testHash = await bcrypt.hash('admin123', 10);
        console.log('Test directe hash:', testHash);
        const testValid = await bcrypt.compare('admin123', testHash);
        console.log('Test directe hash verificatie:', testValid);

        // Maak nieuwe admin gebruiker met plain text wachtwoord
        const adminUser = new User({
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin123',  // Plain text wachtwoord
            role: 'admin'
        });

        console.log('Voor save - password:', adminUser.password);
        
        // Sla de gebruiker op
        await adminUser.save();
        console.log('Na save - password:', adminUser.password);

        // Test het wachtwoord direct met bcrypt
        const directCheck = await bcrypt.compare('admin123', adminUser.password);
        console.log('Directe bcrypt check:', directCheck);

        // Test het wachtwoord via de model methode
        const modelCheck = await adminUser.verifyPassword('admin123');
        console.log('Model verificatie check:', modelCheck);

    } catch (error) {
        console.error('Fout bij aanmaken admin gebruiker:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createAdminUser(); 
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        default: 'admin@wouterkoppen.nl'
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'editor', 'viewer'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Methode om wachtwoord te verifiëren
userSchema.methods.verifyPassword = async function(password) {
    try {
        console.log('Verifiëren van wachtwoord...');
        console.log('Gebruiker:', this.username);
        console.log('Rol:', this.role);
        console.log('Ingevoerd wachtwoord:', password);
        console.log('Opgeslagen hash:', this.password);
        
        // Gebruik bcrypt.compare voor de vergelijking
        const result = await bcrypt.compare(password, this.password);
        console.log('Bcrypt vergelijking resultaat:', result);
        return result;
    } catch (error) {
        console.error('Fout bij wachtwoord verificatie:', error);
        return false;
    }
};

// Methode om gebruikersgegevens te retourneren zonder gevoelige informatie
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema); 
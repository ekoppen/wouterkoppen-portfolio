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
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'editor', 'viewer'],
        default: 'viewer'
    }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    if (this.password.startsWith('$2a$')) {
        console.log('Wachtwoord is al gehashed, sla hashing over');
        return next();
    }
    
    console.log('Hashing plain text wachtwoord...');
    try {
        this.password = await bcrypt.hash(this.password, 10);
        console.log('Wachtwoord succesvol gehashed');
        next();
    } catch (error) {
        console.error('Fout bij hashen wachtwoord:', error);
        next(error);
    }
});

userSchema.methods.verifyPassword = async function(candidatePassword) {
    try {
        console.log('Verifiëren wachtwoord...');
        console.log('Opgeslagen hash:', this.password);
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        console.log('Verificatie resultaat:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Fout bij wachtwoord verificatie:', error);
        throw error;
    }
};

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema); 
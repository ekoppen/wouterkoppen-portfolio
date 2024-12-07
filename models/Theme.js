const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    colors: {
        // Main colors
        primary: { type: String, default: '#007bff' },
        secondary: { type: String, default: '#6c757d' },
        success: { type: String, default: '#28a745' },
        danger: { type: String, default: '#dc3545' },
        warning: { type: String, default: '#ffc107' },
        info: { type: String, default: '#17a2b8' },

        // Neutral colors
        white: { type: String, default: '#ffffff' },
        gray100: { type: String, default: '#f8f9fa' },
        gray200: { type: String, default: '#e9ecef' },
        gray300: { type: String, default: '#dee2e6' },
        gray400: { type: String, default: '#ced4da' },
        gray500: { type: String, default: '#adb5bd' },
        gray600: { type: String, default: '#6c757d' },
        gray700: { type: String, default: '#495057' },
        gray800: { type: String, default: '#343a40' },
        gray900: { type: String, default: '#212529' },
        black: { type: String, default: '#000000' }
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

// Update the updatedAt timestamp before saving
themeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Theme', themeSchema); 
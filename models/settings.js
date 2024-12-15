const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    siteTitle: {
        type: String,
        required: true,
        default: 'Wouter Koppen'
    },
    siteDescription: {
        type: String,
        required: true,
        default: 'Fotografie portfolio van Wouter Koppen'
    },
    footerText: {
        type: String,
        required: true,
        default: '© 2024 Wouter Koppen'
    },
    defaultTheme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
    },
    photosPerPage: {
        type: Number,
        required: true,
        min: 12,
        max: 100,
        default: 24
    },
    defaultPhotoView: {
        type: String,
        enum: ['grid', 'list'],
        default: 'grid'
    },
    autoThumbnails: {
        type: Boolean,
        default: true
    },
    maxThumbnailSize: {
        type: Number,
        required: true,
        min: 200,
        max: 1000,
        default: 400
    },
    photoCompression: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 85
    }
}, {
    timestamps: true
});

// Zorg ervoor dat er maar één settings document is
settingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings; 
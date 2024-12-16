const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo'
    }],
    order: {
        type: Number,
        default: 9999 // Standaard hoge waarde voor nieuwe albums
    }
}, {
    timestamps: true
});

// Zorg ervoor dat het Home album altijd order 0 heeft
albumSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('title')) {
        if (this.title.toLowerCase() === 'home') {
            this.order = 0;
        } else if (this.isNew && !this.order) {
            // Vind de hoogste order waarde en voeg 1 toe
            const highestOrder = await this.constructor.findOne({}, 'order')
                .sort('-order')
                .exec();
            this.order = (highestOrder?.order || 0) + 1;
        }
    }
    next();
});

module.exports = mongoose.model('Album', albumSchema); 
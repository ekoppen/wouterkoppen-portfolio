const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    photos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update de updatedAt timestamp voor elke wijziging
albumSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Album = mongoose.model('Album', albumSchema);

module.exports = Album; 
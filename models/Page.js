const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    albums: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Album'
    }],
    order: {
        type: Number,
        default: 0
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

// Update de updatedAt timestamp voor elke wijziging
pageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Page = mongoose.model('Page', pageSchema);

module.exports = Page; 
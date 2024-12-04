const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
    filename: String,
    path: String,
    title: String,
    description: String,
    category: String,
    order: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Photo', PhotoSchema); 
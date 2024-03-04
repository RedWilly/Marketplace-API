const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
    address: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Collection', CollectionSchema);

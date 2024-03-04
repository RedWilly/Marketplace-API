const mongoose = require('mongoose');

const ERC721Schema = new mongoose.Schema({
    address: { type: String, required: true },
    tokenId: { type: String, required: true },
    owner: { type: String, required: true },
    name: { type: String },
    symbol: { type: String },
    uri: { type: String },
    image: { type: String },
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ERC721', ERC721Schema);

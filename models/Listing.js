const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
    erc721Address: { type: String, required: true },
    tokenId: { type: String, required: true },
    seller: { type: String, required: true },
    // price: { type: Number, required: true },
    price: { type: String, required: true },
    expireTimestamp: Number,
    listedTimestamp: Number,
    status: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);

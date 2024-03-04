const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
    erc721Address: { type: String, required: true },
    tokenId: { type: String, required: true },
    bidder: { type: String, required: true },
    value: { type: Number, required: true },
    expireTimestamp: { type: Number, required: true },
    status: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Bid', BidSchema);
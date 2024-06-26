const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    erc721Address: { type: String, required: true },
    tokenId: { type: String, required: true },
    buyer: { type: String, required: true },
    seller: { type: String, required: true },
    price: { type: String, required: true },
    serviceFee: String,
    royaltyFee: String,
    timestamp: String,
    status: { type: String, required: true },
    txid: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);

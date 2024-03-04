const mongoose = require('mongoose');

const CollectionStatSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true }, // Add this line
    floorPrice: { type: Number, required: true },
    totalVolumeTraded: { type: Number, required: true },
    totalVolumeTradedWETH: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CollectionStat', CollectionStatSchema);

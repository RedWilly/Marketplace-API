const mongoose = require('mongoose');

const CollectionStatSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true }, // Add this line
    floorPrice: { type: String, required: true },
    totalVolumeTraded: { type: String, required: true },
    totalVolumeTradedWETH: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CollectionStat', CollectionStatSchema);

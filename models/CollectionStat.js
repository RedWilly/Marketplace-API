const mongoose = require('mongoose');

const CollectionStatSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true }, // Add this line
    floorPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
    // floorPrice: { type: String, required: true },
    totalVolumeTraded: { type: mongoose.Schema.Types.Decimal128, required: true },
    totalVolumeTradedWETH: { type: mongoose.Schema.Types.Decimal128, required: true },
}, { timestamps: true });

module.exports = mongoose.model('CollectionStat', CollectionStatSchema);

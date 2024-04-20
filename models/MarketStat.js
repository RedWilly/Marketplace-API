const mongoose = require('mongoose');

const MarketStatSchema = new mongoose.Schema({
    totalVolumeTraded: { type: mongoose.Schema.Types.Decimal128, required: true, default: "0" },
    totalVolumeTradedWETH: { type: mongoose.Schema.Types.Decimal128, required: true, default: "0" }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('MarketStat', MarketStatSchema);

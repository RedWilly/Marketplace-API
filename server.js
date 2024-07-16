require('dotenv').config();
const cors = require('cors');
const cron = require('node-cron');
const express = require('express');
const mongoose = require('mongoose');
const { ethers } = require('ethers');

const { initEventPolling } = require('./Listeners');

const CollectionStat = require('./models/CollectionStat');
const Listing = require('./models/Listing');
const Sale = require('./models/Sale')
const Bid = require('./models/Bid')
const MarketStat = require('./models/MarketStat')

const marketplaceABI = require('./ABI/marketplaceABI.json');
const { getPrice } = require('./Price');


const app = express();
const PORT = process.env.PORT || 9005;

app.use(cors());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_PROJECT_ID);

const marketplaceContract = new ethers.Contract(
    process.env.MARKETPLACE_CONTRACT_ADDRESS,
    marketplaceABI,
    provider
);

//remove expired listings
async function removeExpiredListings() {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    try {
        const result = await Listing.deleteMany({
            expireTimestamp: { $lte: nowInSeconds }
        });
        console.log(`Expired listings removed: ${result.deletedCount}`);
    } catch (error) {
        console.error('Error removing expired listings:', error);
    }
}


// Scheduling the job to run once every day at 00:01 (1 minute past midnight)
cron.schedule('1 0 * * *', () => {
    console.log('Running a daily check for expired listings at ' + new Date().toString());
    removeExpiredListings();
});


// Add a health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Marketplace V2 Monitor Running' });
});

// -- Get BTT PRICE
app.get('/api/price', async (req, res) => {
    try {
        const price = await getPrice();
        res.json({ price });
    } catch (error) {
        res.status(500).send('Failed to fetch price');
    }
});

// total volume trade for all
app.get('/api/market-stats', async (req, res) => {
    try {
        const stats = await MarketStat.findOne({});
        if (!stats) {
            res.json({
                totalVolumeTraded: "0",
                totalVolumeTradedWETH: "0"
            });
        } else {
            res.json({
                totalVolumeTraded: stats.totalVolumeTraded.toString(),
                totalVolumeTradedWETH: stats.totalVolumeTradedWETH.toString()
            });
        }
    } catch (error) {
        console.error('Error fetching market stats:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});



// --FLOORPRICE & TOTAL VOLUME SECTION --

//query to get total volume trade for a collection & floor price
app.get('/api/collection-stats/:erc721Address', async (req, res) => {
    try {
        const erc721Address = req.params.erc721Address;
        const collectionStat = await CollectionStat.findOne({ address: erc721Address });

        // send default values if no data is found
        if (!collectionStat) {
            res.json({
                floorPrice: "0",
                totalVolumeTraded: "0",
                totalVolumeTradedWETH: "0"
            });
        } else {
            // converting Decimal128 fields to strings
            const totalVolumeTraded = collectionStat.totalVolumeTraded ? collectionStat.totalVolumeTraded.toString() : "0";
            const totalVolumeTradedWETH = collectionStat.totalVolumeTradedWETH ? collectionStat.totalVolumeTradedWETH.toString() : "0";
            const floorPrice = collectionStat.floorPrice ? collectionStat.floorPrice.toString() : "0";

            res.json({
                floorPrice: floorPrice,
                totalVolumeTraded: totalVolumeTraded,
                totalVolumeTradedWETH: totalVolumeTradedWETH
            });
        }
    } catch (error) {
        console.error('Error fetching collection stats:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});

// Fetch all collection statistics
app.get('/api/collection-stats', async (req, res) => {
    try {
        const collectionStats = await CollectionStat.find({});
        if (!collectionStats.length) {
            return res.status(404).json({ message: 'No collection statistics found.' });
        }
        const formattedStats = collectionStats.map(stat => ({
            address: stat.address,
            floorPrice: stat.floorPrice ? stat.floorPrice.toString() : "0",  // Convert Decimal128 to String
            totalVolumeTraded: stat.totalVolumeTraded ? stat.totalVolumeTraded.toString() : "0",
            totalVolumeTradedWETH: stat.totalVolumeTradedWETH ? stat.totalVolumeTradedWETH.toString() : "0",  // Handle the field if it exists
            createdAt: stat.createdAt,
            updatedAt: stat.updatedAt
        }));
        res.json(formattedStats);
    } catch (error) {
        console.error('Error fetching collection stats:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});


// --SALES SECTION

/*
 retrieves most recently sold NFTs on the marketplace
*/
app.get('/api/nfts/sold', async (_, res) => {
    try {
        const soldNFTs = await Sale.find({}).sort({ timestamp: -1 });
        res.json(soldNFTs);
    } catch (error) {
        console.error('Error fetching sold NFTs:', error);

        // Check for specific error types and provide tailored messages
        if (error.name === 'MongoError') {
            res.status(500).send({ message: "An error occurred while accessing the database. Please try again later." });
        } else {
            res.status(500).send({ message: "An internal server error occurred. Please try again later." });
        }
    }
});

/*
 retrieves sales for a specific NFT
*/
app.get('/api/nfts/:erc721Address/:tokenId/sales', async (req, res) => {
    const { erc721Address, tokenId } = req.params;

    try {
        const sales = await Sale.find({
            erc721Address: erc721Address,
            tokenId: tokenId
        }).sort({ timestamp: -1 });

        // Always return the array of sales, even if it is empty
        res.json(sales);
    } catch (error) {
        console.error('Error fetching sales for NFT:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});


// Fetch the last sale for a specific NFT
app.get('/api/nfts/:erc721Address/:tokenId/last-sale', async (req, res) => {
    const { erc721Address, tokenId } = req.params;

    try {
        const lastSale = await Sale.findOne({
            erc721Address: erc721Address,
            tokenId: tokenId
        }).sort({ timestamp: -1 });

        res.json(lastSale);
    } catch (error) {
        console.error('Error fetching the last sale for NFT:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});


// -- LISTING SECTION ---

/*
 fetch active listings
*/
app.get('/api/listings/active', async (req, res) => {
    try {
        const activeListings = await Listing.find({ status: 'Active' }).sort({ 'listedTimestamp': -1 }); // all active listings and sorts them by listedTimestamp descending
        res.json(activeListings);
    } catch (error) {
        console.error('Error fetching active listings:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});

/* 
 fetch listings by a seller
*/
app.get('/api/listings/seller/:sellerAddress', async (req, res) => {
    const sellerAddress = req.params.sellerAddress;

    try {
        const listings = await Listing.find({ seller: sellerAddress }).sort({ listedTimestamp: -1 }); // Sort by listedTimestamp descending
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings for seller:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});

/*
 fetch active listing for an NFT
*/
app.get('/api/listings/:erc721Address/:tokenId/active', async (req, res) => {
    const { erc721Address, tokenId } = req.params;

    try {
        const activeListing = await Listing.findOne({
            erc721Address: erc721Address,
            tokenId: tokenId,
            status: "Active"
        });

        res.json(activeListing);
    } catch (error) {
        console.error('Error fetching active listing:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});

/*
 fetches all active listings for a collection
*/
app.get('/api/listings/erc721/:erc721Address', async (req, res) => {
    try {
        const erc721Address = req.params.erc721Address;
        const activeListings = await Listing.find({
            erc721Address: erc721Address,
            status: "Active"
        }).sort({ listedTimestamp: -1 }); // sorting by listing timestamp if needed

        // always return the array (which may be empty)
        res.json(activeListings);
    } catch (error) {
        console.error('Error fetching active listings:', error);
        res.status(500).send({ message: "An internal server error occurred. Please try again later." });
    }
});

// -- BIDS SECTION --

/*
 fetch bids by a bidder
*/
app.get('/api/bids/bidder/:bidderAddress', async (req, res) => {
    const bidderAddress = req.params.bidderAddress;

    try {
        const bids = await Bid.find({ bidder: bidderAddress }).sort({ createdAt: -1 });
        res.json(bids);
    } catch (error) {
        console.error('Error fetching bids by bidder:', error);
        res.status(500).send({ message: "Server error occurred." });
    }
});

/*
 fetch all active bids
*/
app.get('/api/bids/active', async (_, res) => {
    try {
        const activeBids = await Bid.find({ status: 'Active' }).sort({ createdAt: -1 });
        res.json(activeBids);
    } catch (error) {
        console.error('Error fetching active bids:', error);
        res.status(500).send({ message: "Server error occurred." });
    }
});

/*  
 fetches active bids for a specific NFT
*/
app.get('/api/bids/:erc721Address/:tokenId/active', async (req, res) => {
    const { erc721Address, tokenId } = req.params;

    try {
        const activeBids = await Bid.find({
            erc721Address: erc721Address,
            tokenId: tokenId,
            status: "Active"
        }).sort({ createdAt: -1 });

        // Always return the array of active bids, even if it is empty
        res.json(activeBids);
    } catch (error) {
        console.error('Error fetching active bids for NFT:', error);
        res.status(500).send({ message: "Server error occurred." });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start the event polling process
    initEventPolling(marketplaceContract, provider);
});

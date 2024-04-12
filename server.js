require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { ethers } = require('ethers');

const { initEventPolling } = require('./Listeners');

const CollectionStat = require('./models/CollectionStat');
const Listing = require('./models/Listing');
const Sale = require('./models/Sale')
const Bid = require('./models/Bid')

const marketplaceABI = require('./ABI/marketplaceABI.json');

const app = express();
const PORT = process.env.PORT || 3002;

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

app.get('/', (req, res) => {
    res.send('Marketplace V2 Monitor Running');
});

// --FLOORPRICE & TOTAL VOLUME SECTION --

//query to get total volume trade for a collection & floor price
app.get('/api/collection-stats/:erc721Address', async (req, res) => {
    try {
        const erc721Address = req.params.erc721Address;
        const collectionStat = await CollectionStat.findOne({ address: erc721Address });

        if (!collectionStat) {
            return res.status(404).send({ message: "Collection statistics not found for the provided address." });
        }

        res.json({
            floorPrice: collectionStat.floorPrice,
            totalVolumeTraded: collectionStat.totalVolumeTraded,
            totalVolumeTradedWETH: collectionStat.totalVolumeTradedWETH
        });
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

        if (!sales.length) {
            return res.status(404).send({ message: "No sales found for the specified NFT." });
        }

        res.json(sales);
    } catch (error) {
        console.error('Error fetching sales for NFT:', error);
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
        if (activeListings.length === 0) {
            return res.status(404).send({ message: "No active listings found." });
        }
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
        if (listings.length === 0) {
            return res.status(404).send({ message: "No listings found for this seller." });
        }
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

        if (!activeListing) {
            return res.status(404).send({ message: "Active listing not found for the specified NFT." });
        }

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

        if (!activeListings.length) {
            return res.status(404).send({ message: "No active listings found for this Collection." });
        }

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
        if (bids.length === 0) {
            return res.status(404).send({ message: "No bids found for this bidder." });
        }
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

        if (!activeBids.length) {
            return res.status(404).send({ message: "No active bids found for the specified NFT." });
        }

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

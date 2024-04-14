//incase its misses block

require('dotenv').config();
const { ethers } = require('ethers');
const mongoose = require('mongoose');
const Listing = require('./models/Listing');
const marketplaceABI = require('./ABI/marketplaceABI.json');

// MongoDB as always
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_PROJECT_ID);
const marketplaceContract = new ethers.Contract(
    process.env.MARKETPLACE_CONTRACT_ADDRESS,
    marketplaceABI,
    provider
);

async function handleTokenListedEvent(event) {
    const { erc721Address, tokenId, listing } = event.args;
    console.log(`Processing TokenListed Event for tokenId: ${tokenId.toString()} at block: ${event.blockNumber}`);

    const newListing = new Listing({
        erc721Address,
        tokenId: tokenId.toString(),
        seller: listing.seller,
        price: listing.value,
        expireTimestamp: listing.expireTimestamp,
        listedTimestamp: Date.now(),
        status: 'Active',
    });

    await newListing.save();
    console.log(`New listing for tokenId ${tokenId.toString()} saved.`);
}

async function handleTokenDelistedEvent(event) {
    const { erc721Address, tokenId } = event.args;
    console.log(`Processing TokenDelisted Event for tokenId: ${tokenId.toString()} at block: ${event.blockNumber}`);
    await Listing.deleteOne({
        tokenId: tokenId.toString(),
        erc721Address: erc721Address,
    });
    console.log(`Listing for tokenId ${tokenId.toString()} removed.`);
}

async function handleTokenBidEnteredEvent(event) {
    const { erc721Address, tokenId, bidder, bidValue, expireTimestamp } = event.args;
    console.log(`Processing TokenBidEntered Event for tokenId: ${tokenId.toString()} at block: ${event.blockNumber}`);
    const newBid = new Bid({
        erc721Address: erc721Address,
        tokenId: tokenId.toString(),
        bidder: bidder,
        value: bidValue,
        expireTimestamp: expireTimestamp,
        status: 'Active',
    });
    await newBid.save();
    console.log(`New bid for tokenId ${tokenId.toString()} saved.`);
}

async function handleTokenBidWithdrawnEvent(event) {
    const { erc721Address, tokenId, bidder } = event.args;
    console.log(`Processing TokenBidWithdrawn Event for tokenId: ${tokenId.toString()} at block: ${event.blockNumber}`);
    await Bid.deleteOne({
        tokenId: tokenId.toString(),
        bidder: bidder,
        erc721Address: erc721Address,
    });
    console.log(`Bid for tokenId ${tokenId.toString()} removed.`);
}

async function processEventsForBlock(blockNumber) {
    console.log(`Processing block ${blockNumber}`);

    const events = await marketplaceContract.queryFilter({}, blockNumber, blockNumber);
    for (let event of events) {
        switch (event.event) {
            case 'TokenListed':
                await handleTokenListedEvent(event);
                console.log("Received TokenListed event:", event);
                console.log("Event args:", event.args);
                break;
            case 'TokenDelisted':
                await handleTokenDelistedEvent(event);
                break;
            case 'TokenBidEntered':
                await handleTokenBidEnteredEvent(event);
                break;
            case 'TokenBidWithdrawn':
                await handleTokenBidWithdrawnEvent(event);
                break;
            default:
                console.log(`Unhandled event type: ${event.event}`);
        }
    }
}

async function fetchAndProcessEvents(startBlock, endBlock) {
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        await processEventsForBlock(blockNumber);
    }
    console.log(`Finished processing events from block ${startBlock} to ${endBlock}`);
}

const startBlock = 35837332;
const endBlock = 35837332;

fetchAndProcessEvents(startBlock, endBlock)
    .then(() => console.log('Successfully processed all events in the specified range.'))
    .catch(console.error);
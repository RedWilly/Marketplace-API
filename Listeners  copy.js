const Listing = require('./models/Listing');
const Sale = require('./models/Sale');
const Bid = require('./models/Bid');
const CollectionStat = require('./models/CollectionStat')

const fs = require('fs');
const path = require('path');

//dont miss any event
const LAST_BLOCK_FILE = path.join(__dirname, 'lastBlock.txt');
const eventProcessingTracker = {}; // { blockNumber: numberOfEventsProcessed }
let lowestPendingBlock = null;

function saveLastProcessedBlock(blockNumber) {
    fs.writeFileSync(LAST_BLOCK_FILE, blockNumber.toString());
}

function getLastProcessedBlock() {
    if (!fs.existsSync(LAST_BLOCK_FILE)) {
        return 'latest';
    }
    const blockNumber = fs.readFileSync(LAST_BLOCK_FILE, 'utf8');
    return parseInt(blockNumber) + 1;
}

function recordEventProcessingStart(blockNumber) {
    if (!eventProcessingTracker[blockNumber]) {
        eventProcessingTracker[blockNumber] = 1;
    } else {
        eventProcessingTracker[blockNumber]++;
    }
    if (lowestPendingBlock === null || blockNumber < lowestPendingBlock) {
        lowestPendingBlock = blockNumber;
    }
}

function recordEventProcessingComplete(blockNumber) {
    eventProcessingTracker[blockNumber]--;

    // --checking if all events for the lowest pending block have been processed
    if (eventProcessingTracker[lowestPendingBlock] === 0) {
        saveLastProcessedBlock(lowestPendingBlock);
        delete eventProcessingTracker[lowestPendingBlock]; // Clean up

        // pdateing the lowest pending block
        const pendingBlocks = Object.keys(eventProcessingTracker).map(Number).sort((a, b) => a - b);
        lowestPendingBlock = pendingBlocks.length > 0 ? pendingBlocks[0] : null;
    }
}

function setupTokenListedListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenListed({
        fromBlock: fromBlock
    }, async (error, event) => {
        if (error) {
            console.error('TokenListed Error:', error);
        } else {
            console.log('TokenListed Event:', event);
            recordEventProcessingStart(event.blockNumber);

            // Create a new listing document in MongoDB
            const newListing = new Listing({
                erc721Address: event.returnValues.erc721Address,
                tokenId: event.returnValues.tokenId.toString(),
                seller: event.returnValues.listing.seller,
                price: event.returnValues.listing.value,
                expireTimestamp: event.returnValues.listing.expireTimestamp,
                listedTimestamp: Date.now(),
                status: 'Active',
            });
            newListing.save().then(() => console.log('New listing saved.'));
            console.log(`Updating floor price for address: ${event.returnValues.erc721Address}`);
            await updateFloorPrice(event.returnValues.erc721Address);
            recordEventProcessingComplete(event.blockNumber);
        }
    });
}

function setupTokenDelistedListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenDelisted({
        fromBlock: fromBlock
    }, (error, event) => {
        if (error) {
            console.error('TokenDelisted Error:', error);
        } else {
            console.log('TokenDelisted Event:', event);
            recordEventProcessingStart(event.blockNumber);

            // Remove the listing info from MongoDB
            Listing.deleteOne({
                tokenId: event.returnValues.tokenId.toString(),
                erc721Address: event.returnValues.erc721Address,
            }).then(() => console.log('Listing removed.'));

            recordEventProcessingComplete(event.blockNumber);
        }
    });
}

function setupTokenBoughtListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenBought({
        fromBlock: fromBlock
    }, async (error, event) => {
        if (error) {
            console.error('TokenBought Error:', error);
        } else {
            console.log('TokenBought Event:', event);
            recordEventProcessingStart(event.blockNumber);
            // Create a new sale document and remove the listing from MongoDB
            const newSale = new Sale({
                erc721Address: event.returnValues.erc721Address,
                tokenId: event.returnValues.tokenId.toString(),
                buyer: event.returnValues.buyer,
                seller: event.returnValues.listing.seller,
                price: event.returnValues.listing.value,
                serviceFee: event.returnValues.serviceFee,
                royaltyFee: event.returnValues.royaltyFee,
                timestamp: Date.now(),
                status: 'Sold',
                txid: event.transactionHash,
            });

            // Save the new sale
            await newSale.save();
            console.log('New sale saved.');

            // Attempt to find and delete the listing associated with the tokenId and erc721Address
            const deletedListing = await Listing.findOneAndDelete({
                tokenId: event.returnValues.tokenId.toString(),
                erc721Address: event.returnValues.erc721Address
            });

            if (deletedListing) {
                console.log(`Listing for tokenId ${event.returnValues.tokenId.toString()} removed.`);
            } else {
                console.error(`Listing for tokenId ${event.returnValues.tokenId.toString()} not found or already removed.`);
            }

            // Update totalVolumeTraded and floor price for the collection
            await updateTotalVolumeTraded(event.returnValues.erc721Address, event.returnValues.listing.value);
            await updateFloorPrice(event.returnValues.erc721Address);
            recordEventProcessingComplete(event.blockNumber);
        }
    });
}



function setupTokenBidEnteredListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenBidEntered({
        fromBlock: fromBlock
    }, (error, event) => {
        if (error) {
            console.error('TokenBidEntered Error:', error);
        } else {
            console.log('TokenBidEntered Event:', event);
            recordEventProcessingStart(event.blockNumber);
            // Create a new bid document in MongoDB
            const newBid = new Bid({
                erc721Address: event.returnValues.erc721Address,
                tokenId: event.returnValues.bid.tokenId.toString(),
                bidder: event.returnValues.bid.bidder,
                value: event.returnValues.bid.value,
                expireTimestamp: event.returnValues.bid.expireTimestamp,
                status: 'Active',
            });
            newBid.save().then(() => console.log('New bid saved.'));
            recordEventProcessingComplete(event.blockNumber);
        }
    });
}

function setupTokenBidWithdrawnListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenBidWithdrawn({
        fromBlock: fromBlock
    }, (error, event) => {
        if (error) {
            console.error('TokenBidWithdrawn Error:', error);
        } else {
            console.log('TokenBidWithdrawn Event:', event);
            recordEventProcessingStart(event.blockNumber);
            // Example: Remove the bid document from MongoDB
            Bid.deleteOne({
                tokenId: event.returnValues.bid.tokenId.toString(),
                bidder: event.returnValues.bid.bidder,
                erc721Address: event.returnValues.erc721Address,
            }).then(() => console.log('Bid removed.'));
            recordEventProcessingComplete(event.blockNumber);
        }
    });
}

function setupTokenBidAcceptedListener(contract) {
    const fromBlock = getLastProcessedBlock();

    contract.events.TokenBidAccepted({
        fromBlock: fromBlock
    }, async (error, event) => {
        if (error) {
            console.error('TokenBidAccepted Error:', error);
        } else {
            console.log('TokenBidAccepted Event:', event);
            recordEventProcessingStart(event.blockNumber);
            // Find and delete only the accepted bid for this token
            await Bid.findOneAndDelete({
                tokenId: event.returnValues.tokenId.toString(),
                bidder: event.returnValues.bid.bidder,
                erc721Address: event.returnValues.erc721Address,
            });

            // Check if there's a listing to remove, indicating the item was listed before being sold.
            const listing = await Listing.findOneAndDelete({
                tokenId: event.returnValues.tokenId.toString(),
                erc721Address: event.returnValues.erc721Address,
            });
            if (listing) {
                console.log(`Listing removed for tokenId: ${event.returnValues.tokenId.toString()}`);
            }

            // Regardless of whether it was listed or not, create a sale entry.
            const newSale = new Sale({
                erc721Address: event.returnValues.erc721Address,
                tokenId: event.returnValues.tokenId.toString(),
                buyer: event.returnValues.bid.bidder, // Buyer is the bidder whose bid was accepted
                seller: event.returnValues.seller, // Seller is who accepted the bid, directly from event data
                price: event.returnValues.bid.value,
                serviceFee: event.returnValues.serviceFee,
                royaltyFee: event.returnValues.royaltyFee,
                timestamp: Date.now(),
                status: 'Sold',
                txid: event.transactionHash,
            });
            newSale.save()
                .then(() => console.log('New sale saved.'))
                .catch((saveError) => console.error('Error saving new sale:', saveError));

            await updateTotalVolumeTradedWETH(event.returnValues.erc721Address, event.returnValues.bid.value);
            //await updateFloorPrice(event.returnValues.erc721Address);
            recordEventProcessingComplete(event.blockNumber);
        }
    });
}

async function updateTotalVolumeTraded(erc721Address, salePrice) {
    await CollectionStat.findOneAndUpdate(
        { address: erc721Address },
        { $inc: { totalVolumeTraded: salePrice } },
        { upsert: true, new: true, setDefaultsOnInsert: true } // ill create if not exists with default values
    );
}

async function updateTotalVolumeTradedWETH(erc721Address, bidPrice) {
    // Similar approach for WETH volume
    await CollectionStat.findOneAndUpdate(
        { address: erc721Address },
        { $inc: { totalVolumeTradedWETH: bidPrice } },
        { upsert: true, new: true, setDefaultsOnInsert: true } // ill create if not exists with default values
    );
}

async function updateFloorPrice(erc721Address) {
    try {
        // ill try to find the lowest price from active listings for the specific ERC721 address.
        const lowestListing = await Listing.findOne({ erc721Address: erc721Address, status: 'Active' }).sort({ price: 1 });

        let floorPrice = 0; // by Default the floor is  0 if no listings or sales are found.

        if (lowestListing) {
            // and if there's an active listing, use its price as the floor price.
            floorPrice = lowestListing.price;
        } else {
            // If there are no active listings, find the most recent sale for the ERC721 address.
            const lastSale = await Sale.findOne({ erc721Address: erc721Address }).sort({ timestamp: -1 });
            if (lastSale) {
                floorPrice = lastSale.price; // to the last sale price if available.
            }
        }

        // Updating the CollectionStat with the new floor price or create it if it doesn't exist in thr db
        const update = await CollectionStat.findOneAndUpdate(
            { address: erc721Address },
            { $set: { floorPrice: floorPrice } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`Updated floor price for ${erc721Address}: ${floorPrice}`);
    } catch (error) {
        console.error(`Error updating floor price for ${erc721Address}: ${error}`);
    }
}


module.exports = {
    setupTokenListedListener,
    setupTokenDelistedListener,
    setupTokenBoughtListener,
    setupTokenBidEnteredListener,
    setupTokenBidWithdrawnListener,
    setupTokenBidAcceptedListener,
};

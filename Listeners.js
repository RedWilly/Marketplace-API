const { ethers } = require('ethers');
const { Decimal128 } = require('mongodb'); // Ensure you import Decimal128 from MongoDB
const Listing = require('./models/Listing');
const Sale = require('./models/Sale');
const Bid = require('./models/Bid');
const CollectionStat = require('./models/CollectionStat')

async function updateTotalVolumeTraded(erc721Address, salePrice) {
    try {
        await CollectionStat.findOneAndUpdate(
            { address: erc721Address },
            { $inc: { totalVolumeTraded: Decimal128.fromString(salePrice.toString()) } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        console.error("Error updating total volume traded:", error);
    }
}

async function updateTotalVolumeTradedWETH(erc721Address, bidPrice) {
    // Similar approach for WETH volume
    try {

        await CollectionStat.findOneAndUpdate(
            { address: erc721Address },
            { $inc: { totalVolumeTradedWETH: Decimal128.fromString(bidPrice.toString()) } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        console.error("Error updating total WETH volume traded:", error);
    }
}

async function updateFloorPrice(erc721Address) {
    try {
        // ill try to find the lowest price from active listings for the specific ERC721 address.
        const lowestListing = await Listing.findOne({ erc721Address: erc721Address, status: 'Active' }).sort({ price: 1 });

        //let floorPrice = 0; // by Default the floor is  0 if no listings or sales are found.
        let floorPrice = Decimal128.fromString("0");

        if (lowestListing) {
            // and if there's an active listing, use its price as the floor price.
            // floorPrice = lowestListing.price;
            floorPrice = Decimal128.fromString(lowestListing.price.toString());
        } else {
            // If there are no active listings, find the most recent sale for the ERC721 address.
            const lastSale = await Sale.findOne({ erc721Address: erc721Address }).sort({ timestamp: -1 });
            if (lastSale) {
                // floorPrice = lastSale.price; // to the last sale price if available.
                floorPrice = Decimal128.fromString(lastSale.price.toString());
            }
        }

        // Updating the CollectionStat with the new floor price or create it if it doesn't exist in thr db
        await CollectionStat.findOneAndUpdate(
            { address: erc721Address },
            { $set: { floorPrice: floorPrice } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`Updated floor price for ${erc721Address}: ${floorPrice}`);
    } catch (error) {
        console.error(`Error updating floor price for ${erc721Address}: ${error}`);
    }
}

async function handleTokenListed(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;
    const listing = event.args.listing;

    const seller = listing.seller;
    const price = listing.value;
    const expireTimestamp = listing.expireTimestamp;

    try {
        await Listing.findOneAndUpdate(
            {
                erc721Address: erc721Address,
                tokenId: tokenId.toString()
            },
            {
                erc721Address: erc721Address,
                tokenId: tokenId.toString(),
                seller: seller,
                price: price,
                expireTimestamp: expireTimestamp,
                listedTimestamp: Date.now(),
                status: 'Active',
            },
            {
                upsert: true,
                new: true,
            }
        );

        console.log(`Listing updated for tokenId ${tokenId.toString()} at address ${erc721Address}`);

        await updateFloorPrice(erc721Address);
    } catch (error) {
        console.error(`Error handling TokenListed for tokenId ${tokenId.toString()} at address ${erc721Address}:`, error);
    }
}


async function handleTokenDelisted(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;

    // Proceed to delete the listing
    const result = await Listing.deleteOne({
        tokenId: tokenId.toString(),
        erc721Address: erc721Address,
    });

    if (result.deletedCount > 0) {
        console.log(`Listing removed for tokenId ${tokenId.toString()} at address ${erc721Address}.`);
    } else {
        console.log(`No listing found to remove for TokenDelisted event for tokenId ${tokenId.toString()} at address ${erc721Address}.`);
    }
}



async function handleTokenBought(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;
    const buyer = event.args.buyer;
    const listing = event.args.listing;
    const seller = listing.seller;
    const price = listing.value;
    const serviceFee = event.args.serviceFee;
    const royaltyFee = event.args.royaltyFee;
    const transactionHash = event.transactionHash;

    // proceed to record the sale
    const newSale = new Sale({
        erc721Address: erc721Address,
        tokenId: tokenId.toString(),
        buyer: buyer,
        seller: seller,
        price: price,
        serviceFee: serviceFee,
        royaltyFee: royaltyFee,
        timestamp: Date.now(),
        status: 'Sold',
        txid: transactionHash,
    });

    try {
        await newSale.save();
        console.log(`New sale saved for tokenId ${tokenId.toString()} at address ${erc721Address}`);

        // remove the bought nft
        await Listing.findOneAndDelete({
            tokenId: tokenId.toString(),
            erc721Address: erc721Address,
        });

        // Update total volume traded and floor price for the collection
        await updateTotalVolumeTraded(erc721Address, price);
        await updateFloorPrice(erc721Address);
    } catch (error) {
        console.error(`Error handling TokenBought for tokenId ${tokenId.toString()} at address ${erc721Address}:`, error);
    }
}


async function handleTokenBidEntered(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;
    const bid = event.args.bid;
    const bidder = bid.bidder;
    const bidValue = bid.value;
    const expireTimestamp = bid.expireTimestamp;

    // proceed to record the bid
    const newBid = new Bid({
        erc721Address: erc721Address,
        tokenId: tokenId.toString(),
        bidder: bidder,
        value: bidValue,
        expireTimestamp: expireTimestamp,
        status: 'Active',
    });

    try {
        await newBid.save();
        console.log(`New bid saved for tokenId ${tokenId.toString()} at address ${erc721Address}`);
    } catch (error) {
        console.error(`Error handling TokenBidEntered for tokenId ${tokenId.toString()} at address ${erc721Address}:`, error);
    }
}


async function handleTokenBidWithdrawn(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;
    const bid = event.args.bid;
    const bidder = bid.bidder;

    // Proceed to delete the bid
    const result = await Bid.deleteOne({
        tokenId: tokenId.toString(),
        bidder: bidder,
        erc721Address: erc721Address,
    });

    if (result.deletedCount > 0) {
        console.log(`Bid removed for tokenId ${tokenId.toString()} at address ${erc721Address}.`);
    } else {
        console.log(`No bid found to remove for tokenId ${tokenId.toString()} at address ${erc721Address}.`);
    }
}


async function handleTokenBidAccepted(event) {
    const erc721Address = event.args.erc721Address;
    const tokenId = event.args.tokenId;
    const seller = event.args.seller;
    const bid = event.args.bid;
    const bidder = bid.bidder;
    const bidValue = bid.value;
    const serviceFee = event.args.serviceFee;
    const royaltyFee = event.args.royaltyFee;
    const transactionHash = event.transactionHash;

    await Bid.findOneAndDelete({
        tokenId: tokenId.toString(),
        bidder: bidder,
        erc721Address: erc721Address,
    });

    await Listing.findOneAndDelete({
        tokenId: tokenId.toString(),
        erc721Address: erc721Address,
    });

    // Record the sale
    const newSale = new Sale({
        erc721Address: erc721Address,
        tokenId: tokenId.toString(),
        buyer: bidder,
        seller: seller,
        price: bidValue,
        serviceFee: serviceFee,
        royaltyFee: royaltyFee,
        timestamp: Date.now(),
        status: 'Sold',
        txid: transactionHash,
    });

    try {
        await newSale.save();
        console.log(`New sale saved for tokenId ${tokenId.toString()} at address ${erc721Address}`);

        // Update the total volume traded in WETH and the floor price for the collection
        await updateTotalVolumeTradedWETH(erc721Address, bidValue);
        await updateFloorPrice(erc721Address);
    } catch (error) {
        console.error(`Error handling TokenBidAccepted for tokenId ${tokenId.toString()} at address ${erc721Address}:`, error);
    }
}


async function fetchAndProcessEvents(contract, provider) {
    let latestProcessedBlock = await provider.getBlockNumber() - 1;

    async function pollForEvents() {
        const currentBlock = await provider.getBlockNumber();
        if (currentBlock > latestProcessedBlock) {
            for (let i = latestProcessedBlock + 1; i <= currentBlock; i++) {
                const events = await contract.queryFilter({}, i, i);
                for (let event of events) {
                    switch (event.event) {
                        case 'TokenListed':
                            await handleTokenListed(event);
                            break;
                        case 'TokenDelisted':
                            await handleTokenDelisted(event);
                            break;
                        case 'TokenBought':
                            await handleTokenBought(event);
                            break;
                        case 'TokenBidEntered':
                            await handleTokenBidEntered(event);
                            break;
                        case 'TokenBidWithdrawn':
                            await handleTokenBidWithdrawn(event);
                            break;
                        case 'TokenBidAccepted':
                            await handleTokenBidAccepted(event);
                            break;
                        // more cases
                    }
                }
            }
            latestProcessedBlock = currentBlock;
        }
        setTimeout(pollForEvents, 1700);
    }

    pollForEvents();
}

module.exports = {
    initEventPolling: fetchAndProcessEvents,
};

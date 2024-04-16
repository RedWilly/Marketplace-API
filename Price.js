const axios = require('axios');
const cacheDuration = 300000; // Cache duration for 5 minutes

let cachedPrice = null;
let lastFetchTime = 0;

async function fetchPriceFromKraken() {
    try {
        const response = await axios.get('https://api.kraken.com/0/public/Ticker?pair=BTTUSD');
        const price = response.data.result.BTTUSD.c[0]; // -current price...
        return price;
    } catch (error) {
        console.error('Error fetching price from Kraken:', error);
        throw error;
    }
}

async function getPrice() {
    const now = Date.now();
    if (!cachedPrice || (now - lastFetchTime) > cacheDuration) {
        cachedPrice = await fetchPriceFromKraken();
        lastFetchTime = now;
    }
    return cachedPrice;
}

module.exports = {
    getPrice
};

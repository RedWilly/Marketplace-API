// const axios = require('axios');

// // Define the RPC endpoints
// const endpoints = [
//     'https://rpc.bt.io',
//     'https://rpc.bittorrentchain.io',
//     'https://bittorrent.drpc.org'
// ];

// // Function to fetch the latest block from an endpoint
// const fetchLatestBlock = async (url) => {
//     const start = Date.now(); // Start time for latency calculation
//     try {
//         const response = await axios.post(url, {
//             jsonrpc: "2.0",
//             method: "eth_getBlockByNumber",
//             params: ["latest", false],
//             id: 1
//         });
//         const latency = Date.now() - start;
//         const blockNumberHex = response.data.result.number;
//         const blockNumber = parseInt(blockNumberHex, 16); // Convert hex to decimal
//         return {
//             url,
//             blockNumber: blockNumber,
//             latency
//         };
//     } catch (error) {
//         console.error(`Error fetching data from ${url}:`, error.message);
//         return {
//             url,
//             blockNumber: 'N/A',
//             latency: 'N/A'
//         };
//     }
// };

// // Function to test all endpoints and display results
// const testRpcEndpoints = async () => {
//     const promises = endpoints.map(endpoint => fetchLatestBlock(endpoint));
//     const results = await Promise.all(promises);

//     // Sort results by latency
//     results.sort((a, b) => (a.latency > b.latency) ? 1 : -1);

//     // Display results in table format
//     console.table(results.map((result, index) => ({
//         Rank: index + 1,
//         URL: result.url,
//         'Block Number': result.blockNumber,
//         'Latency (ms)': result.latency
//     })));
// };

// testRpcEndpoints();

const axios = require('axios');

const endpoints = [
    'https://rpc.bt.io',
    'https://rpc.bittorrentchain.io',
    'https://bittorrent.drpc.org'
];

const fetchLatestBlock = async (url) => {
    try {
        const start = Date.now();
        const response = await axios.post(url, {
            jsonrpc: "2.0",
            method: "eth_getBlockByNumber",
            params: ["latest", false],
            id: 1
        });
        const latency = Date.now() - start;
        const blockNumberHex = response.data.result.number;
        const blockNumber = parseInt(blockNumberHex, 16);
        return {
            url,
            blockNumber,
            latency
        };
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        return {
            url,
            blockNumber: 'N/A',
            latency: 'N/A'
        };
    }
};

const testRpcEndpointsWithDuration = async (duration) => {
    let results = [];

    const endTime = Date.now() + duration;
    while (Date.now() < endTime) {
        const promises = endpoints.map(endpoint => fetchLatestBlock(endpoint));
        const batchResults = await Promise.all(promises);
        results = results.concat(batchResults);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    processResults(results);
};

const processResults = (results) => {
    const summary = results.reduce((acc, result) => {
        if (!acc[result.url]) {
            acc[result.url] = { count: 0, totalLatency: 0, url: result.url };
        }
        acc[result.url].count++;
        acc[result.url].totalLatency += result.latency;
        return acc;
    }, {});

    const finalResults = Object.values(summary).map(({ url, count, totalLatency }) => ({
        URL: url,
        'Average Latency (ms)': totalLatency / count,
        'Total Tests': count
    })).sort((a, b) => a['Average Latency (ms)'] - b['Average Latency (ms)']);

    console.table(finalResults);
};

// Test RPC endpoints for 10 seconds
testRpcEndpointsWithDuration(10000);

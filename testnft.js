const Web3 = require('web3');

const ERC721_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "from",
                "type": "address",
                "indexed": true
            },
            {
                "name": "to",
                "type": "address",
                "indexed": true
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": true
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

const web3 = new Web3(new Web3.providers.WebsocketProvider('wss://sepolia.blast.io'));

const transferEventSignature = web3.utils.sha3('Transfer(address,address,uint256)');

web3.eth.subscribe('logs', {
    topics: [transferEventSignature]
}, async (error, log) => {
    if (error) {
        console.error("Error:", error);
        return;
    }
    const { address } = log;

    const contract = new web3.eth.Contract(ERC721_ABI, address);

    const collectionName = await contract.methods.name().call();

    const decodedLog = web3.eth.abi.decodeLog(
        ERC721_ABI.find(event => event.name === "Transfer").inputs,
        log.data,
        log.topics.slice(1)
    );

    console.log(`Transfer detected: Token ID ${decodedLog.tokenId} from ${decodedLog.from} to ${decodedLog.to} on contract ${address}`);
    console.log(`Collection name: ${collectionName}`);
}
);

const Web3 = require('web3');

const Url = 'wss://sepolia.blast.io';

const web3 = new Web3(new Web3.providers.WebsocketProvider(Url));

const contractAddress = '0x308b43D015Ac2bf158e7DfFe08a1630A371c81E4';

const abi = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "erc721Address",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "tokenId",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "seller",
                "type": "address"
            },
            {
                "components": [
                    {
                        "internalType": "uint256",
                        "name": "tokenId",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    },
                    {
                        "internalType": "address",
                        "name": "bidder",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "expireTimestamp",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct INFTKEYMarketplaceV2.Bid",
                "name": "bid",
                "type": "tuple"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "serviceFee",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "royaltyFee",
                "type": "uint256"
            }
        ],
        "name": "TokenBidAccepted",
        "type": "event"
    }
];

const contract = new web3.eth.Contract(abi, contractAddress);

contract.events.TokenBidAccepted({
    fromBlock: 'latest',
})
    .on('data', (event) => {
        console.log('TokenBidAccepted Event:', event);
    })
    .on('error', console.error);

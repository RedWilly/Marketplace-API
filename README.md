---
Marketplace API Documentation v1 for Rooni.Art
---

## Introduction

The Marketplace API Backend provides a set of endpoints to interact with the Marketplace smart contract and retrieve market data. The API is built using Node.js, Express, and MongoDB, and it interacts with the blockchain using Ethers.js.

## Setup

### Prerequisites

Before you can run the API, you need to have the following installed on your system:

- Node.js (version 14 or above)
- MongoDB
- Infura Project ID

### Environment Variables

The API uses environment variables for configuration. You need to set the following variables in a `.env` file in the root directory of the project:

```
MONGODB_URI=<Your MongoDB URI>
INFURA_PROJECT_ID=<Your RPC url>
MARKETPLACE_CONTRACT_ADDRESS=<The address of the Marketplace smart contract>
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/RedWilly/Marketplace-API.git
cd Marketplace-api
```

2. Install the dependencies:

```bash
npm install
```

3. Start the API:

```bash
npm start
```

The API will start running on port 3002 by default.

## API Endpoints

The following endpoints are available in the Marketplace API:

### Market Stats

- `GET /api/market-stats`: Retrieves the total volume traded and total volume traded in WETH for the entire marketplace.

### Collection Stats

- `GET /api/collection-stats/:erc721Address`: Retrieves the floor price, total volume traded, and total volume traded in WETH for a specific ERC721 collection.
- `GET /api/collection-stats`: Retrieves the collection stats for all collections.

### Sales

- `GET /api/nfts/sold`: Retrieves the most recently sold NFTs on the marketplace.
- `GET /api/nfts/:erc721Address/:tokenId/sales`: Retrieves the sales history for a specific NFT.
- `GET /api/nfts/:erc721Address/:tokenId/last-sale`: Retrieves the last sale for a specific NFT.

### Listings

- `GET /api/listings/active`: Retrieves all active listings.
- `GET /api/listings/seller/:sellerAddress`: Retrieves all listings by a specific seller.
- `GET /api/listings/:erc721Address/:tokenId/active`: Retrieves the active listing for a specific NFT.
- `GET /api/listings/erc721/:erc721Address`: Retrieves all active listings for a specific ERC721 collection.

### Bids

- `GET /api/bids/bidder/:bidderAddress`: Retrieves all bids by a specific bidder.
- `GET /api/bids/active`: Retrieves all active bids.
- `GET /api/bids/:erc721Address/:tokenId/active`: Retrieves all active bids for a specific NFT.

### Price

- `GET /api/price`: Retrieves the current price of BTT in USD.

## Usage Examples

### Fetching Market Stats

To fetch the total volume traded and total volume traded in WETH for the entire marketplace, you can use the following endpoint:

```http
GET /api/market-stats
```

### Fetching Collection Stats

To fetch the floor price, total volume traded, and total volume traded in WETH for a specific ERC721 collection, you can use the following endpoint:

```http
GET /api/collection-stats/0xYourERC721Address
```

### Fetching Sales

To fetch the most recently sold NFTs on the marketplace, you can use the following endpoint:

```http
GET /api/nfts/sold
```

### Fetching Listings

To fetch all active listings for a specific ERC721 collection, you can use the following endpoint:

```http
GET /api/listings/erc721/0xYourERC721Address
```

### Fetching Bids

To fetch all active bids for a specific NFT, you can use the following endpoint:

```http
GET /api/bids/0xYourERC721Address/YourTokenId/active
```

### Fetching Current BTT Price

To fetch the current price of BTT in USD, you can use the following endpoint:

```http
GET /api/price
```

## Error Handling

The API returns standard HTTP status codes to indicate the success or failure of an API request.

- `200 OK`: The request was successful.
- `404 Not Found`: The requested resource could not be found.
- `500 Internal Server Error`: An error occurred on the server.

## Contributing

If you'd like to contribute to the Marketplace API, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with clear messages.
4. Push your branch to your forked repository.
5. Submit a pull request to the main repository.

### Smart Contract 
```bash
https://github.com/RedWilly/Marketplace-V2
```

## License

The Marketplace API is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).

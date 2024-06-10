---
Marketplace API Documentation v1 for Rooni.Art
---
# NFT Marketplace Backend

This repository contains the backend code for an NFT marketplace. The backend provides API endpoints to interact with the marketplace smart contract and persists data related to listings, sales, bids, and collection statistics.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [API Documentation](#api-documentation)
  - [Market Statistics](#market-statistics)
  - [Collection Statistics](#collection-statistics)
  - [Sales](#sales)
  - [Listings](#listings)
  - [Bids](#bids)
  - [Price](#price)
- [Event Listeners](#event-listeners)
- [Data Models](#data-models)
- [Cron Jobs](#cron-jobs)

## Features

- Tracks active listings, sales, and bids on the NFT marketplace.
- Calculates and updates floor prices and total volume traded for collections.
- Provides API endpoints to fetch marketplace data.
- Listens to events from the smart contract and updates the database accordingly.
- Removes expired listings periodically using cron jobs.

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/RedWilly/Marketplace-API.git
   ```

2. **Install dependencies:**

   ```bash
   cd Marketplace-api
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory and set the following environment variables:

   ```
   MONGODB_URI=<your_mongodb_uri>
   INFURA_PROJECT_ID=<your_rpc_url>
   MARKETPLACE_CONTRACT_ADDRESS=<your_marketplace_contract_address>
   PORT=3002
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

## API Documentation

The API follows a RESTful design and uses JSON for communication. The base URL for the API is `http://localhost:3002/api`.

### Market Statistics

#### Get Overall Marketplace Statistics

```
GET /api/market-stats
```

**Responses**

- **200 OK**

```json
{
    "totalVolumeTraded": "1000000000000000000000",
    "totalVolumeTradedWETH": "5000000000000000000"
}
```

### Collection Statistics

#### Get Statistics for All Collections

```
GET /api/collection-stats
```

**Responses**

- **200 OK**

```json
[
  {
    "address": "0x123...abc",
    "floorPrice": "1000000000000000000",
    "totalVolumeTraded": "1000000000000000000000",
    "totalVolumeTradedWETH": "5000000000000000000",
    "createdAt": "2023-12-20T12:00:00.000Z",
    "updatedAt": "2023-12-20T13:00:00.000Z"
  },
  // ... more collections
]
```

#### Get Statistics for a Specific Collection

```
GET /api/collection-stats/:erc721Address
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.

**Responses**

- **200 OK**

```json
{
  "floorPrice": "1000000000000000000",
  "totalVolumeTraded": "1000000000000000000000",
  "totalVolumeTradedWETH": "5000000000000000000"
}
```

### Sales

#### Get Recent Sales

```
GET /api/nfts/sold
```

**Responses**

- **200 OK**

```json
[
    {
        "_id": "64e05f8e45f4e219e963a32f",
        "erc721Address": "0x123...abc",
        "tokenId": "1",
        "buyer": "0xdef...xyz",
        "seller": "0xabc...123",
        "price": "1000000000000000000",
        "serviceFee": "50000000000000000",
        "royaltyFee": "100000000000000000",
        "timestamp": "1700836206263",
        "status": "Sold",
        "txid": "0x7b8...9a28",
        "createdAt": "2023-12-24T12:30:06.264Z",
        "updatedAt": "2023-12-24T12:30:06.264Z",
        "__v": 0
    },
    // more sale records
]
```

#### Get Sales History for a Specific NFT

```
GET /api/nfts/:erc721Address/:tokenId/sales
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.
- **tokenId** (string, required): The token ID of the NFT.

**Responses**

- **200 OK**

```json
[
    // similar to recent sales, but filtered for the given NFT
]
```

#### Get the Last Sale Record for a Specific NFT

```
GET /api/nfts/:erc721Address/:tokenId/last-sale
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.
- **tokenId** (string, required): The token ID of the NFT.

**Responses**

- **200 OK**

```json
{
    // a single sale record, representing the last time this NFT was sold
}
```


### Listings

#### Get All Active Listings

```
GET /api/listings/active
```

**Responses**

- **200 OK**

```json
[
    {
        "_id": "64e061d345f4e219e963a331",
        "erc721Address": "0x123...abc",
        "tokenId": "2",
        "seller": "0xdef...xyz",
        "price": "1500000000000000000",
        "expireTimestamp": 1701100262,
        "listedTimestamp": 1700836467457,
        "status": "Active",
        "createdAt": "2023-12-24T12:41:07.458Z",
        "updatedAt": "2023-12-24T12:41:07.458Z",
        "__v": 0
    },
    // more active listings
]
```

#### Get Active Listings for a Specific Collection

```
GET /api/listings/erc721/:erc721Address
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.

**Responses**

- **200 OK**

```json
[
    // Similar to all active listings, but filtered for the specific collection
]
```

#### Get Active Listing for a Specific NFT

```
GET /api/listings/:erc721Address/:tokenId/active
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.
- **tokenId** (string, required): The token ID of the NFT.

**Responses**

- **200 OK**

```json
{
    // The active listing for the given NFT, if any
}
```

#### Get Listings by Seller Address

```
GET /api/listings/seller/:sellerAddress
```

**Parameters**

- **sellerAddress** (string, required): The address of the seller.

**Responses**

- **200 OK**

```json
[
    // Listings (both active and inactive) for the given seller
]
```

### Bids

#### Get Active Bids

```
GET /api/bids/active
```

**Responses**

- **200 OK**

```json
[
    {
        "_id": "64e0633945f4e219e963a333",
        "erc721Address": "0x123...abc",
        "tokenId": "2",
        "bidder": "0x456...def",
        "value": "1200000000000000000",
        "expireTimestamp": 1701100482,
        "status": "Active",
        "createdAt": "2023-12-24T12:48:09.098Z",
        "updatedAt": "2023-12-24T12:48:09.098Z",
        "__v": 0
    },
    // more active bids
]
```

#### Get Active Bids for a Specific NFT

```
GET /api/bids/:erc721Address/:tokenId/active
```

**Parameters**

- **erc721Address** (string, required): The address of the ERC721 contract.
- **tokenId** (string, required): The token ID of the NFT.

**Responses**

- **200 OK**

```json
[
    // Active bids for the given NFT
]
```

#### Get Bids by Bidder Address

```
GET /api/bids/bidder/:bidderAddress
```

**Parameters**

- **bidderAddress** (string, required): The address of the bidder.

**Responses**

- **200 OK**

```json
[
    // All bids (active and inactive) made by the given bidder
]
```

### Price

#### Get BTT Price

```
GET /api/price
```

**Responses**

- **200 OK**

```json
{
    "price": "0.0025" 
}
```


## Event Listeners

The backend uses event listeners to keep the database in sync with the marketplace smart contract. It listens to the following events:

- **TokenListed:** When a new NFT is listed for sale.
- **TokenDelisted:** When a listed NFT is removed from sale.
- **TokenBought:** When a listed NFT is bought.
- **TokenBidEntered:** When a new bid is placed on an NFT.
- **TokenBidWithdrawn:** When a bid is withdrawn.
- **TokenBidAccepted:** When a bid is accepted.

## Data Models

- **Listing:** Represents an NFT listed for sale.
- **Sale:** Represents a completed sale of an NFT.
- **Bid:** Represents a bid placed on an NFT.
- **CollectionStat:** Stores aggregate statistics for each ERC721 collection (floor price, total volume traded).
- **MarketStat:** Stores aggregate statistics for the entire marketplace (total volume traded).

## Cron Jobs

- **removeExpiredListings:** Runs daily at 00:01 to remove listings that have passed their expiration timestamp.


## Error Handling

The API returns standard HTTP status codes to indicate the success or failure of an API request.

- `200 OK`: The request was successful.
- `404 Not Found`: The requested resource could not be found.
- `500 Internal Server Error`: An error occurred on the server.

### Technologies Used

- Node.js
- Express.js
- MongoDB
- Ethers.js
- Node-Cron 
- Axios
- Dotenv

## Contributing

Feel free to fork the project and submit pull requests. All contributions are welcome.



### Smart Contract 
```bash
https://github.com/RedWilly/Marketplace-V2
```

## License

The Marketplace API is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).

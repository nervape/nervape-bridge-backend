# Nervape Bridge Backend

CKB L1 to GodWoken Brigde Backend.

It includes 3 simple services: 

- detector: Find bridging transctions
- parser: Parse bridging Nervape MNFTs and calculate corresponding ERC721 token IDs
- minter: Mint ERC721 tokens on L2(GodWoken)

Requirements:

- node >= 16.17.0
- mongodb

### Install

```sh
$ yarn install
```

### Build

```sh
$ yarn build
```

### Start in development

Watching new transactions of bridge address and save bridging transactions to database.

```sh
$ yarn start:detector
```

Parse and validate bridging transaction including target address, L1 token IDs and L2 token IDs

```sh
$ yarn start:parser
```

Mint bridging NFTs on GodWoken

```sh
$ yarn start:minter
```

### Start in production


```sh
$ yarn start:prod:detector
```

```sh
$ yarn start:prod:parser
```

```sh
$ yarn start:prod:minter
```
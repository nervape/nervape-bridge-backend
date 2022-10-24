import dotenv from 'dotenv';
import process from 'process'
// import path from 'path'
import { BridgingClassDict } from './types'

dotenv.config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;

if (!EVM_PRIVATE_KEY) {
    throw new Error('You need to pass EVM_PRIVATE_KEY environment variable.');
}

// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b0000000d Magic Ball
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b0000000c nervape test nft
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b Echo Test
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b 3d
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b Nervape-Mint-Test-3D
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b0000000b Nervape / Mirana Special
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b0000000a mNFT-test-4
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b mNFT-test-2
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b mNFT-test-1
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b mNFT-mock-0
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b 2022-05-16-18-57-05.484-3d
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b 2022-05-16-18-46-06.010-mnft
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b00000009 2022-04-27-16-48-12.280-mnft
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b00000008 Nervape 3D
// 0x53b9a6b381e5f02408ab81bea5462c179f475b7b00000001 Nervape Test 007
const TESTNET_BRIDGING_CLASS_DICT: BridgingClassDict = {
  1: {
      from_chain_class_name: "Nervape Test 007",
      to_chain_class_type: 'character', 
      to_chain_class_id: 2,
      to_chain_type_id: 1
  },
  2: { 
      from_chain_class_name: "",
      to_chain_class_type: 'character', 
      to_chain_class_id: 3,
      to_chain_type_id: 1
  },
  3: { 
      from_chain_class_name: "",
      to_chain_class_type: 'character', 
      to_chain_class_id: 4,
      to_chain_type_id: 1
  },
  4: { 
      from_chain_class_name: "",
      to_chain_class_type: 'character', 
      to_chain_class_id: 5,
      to_chain_type_id: 1,
  },
  5: { 
      from_chain_class_name: "",
      to_chain_class_type: 'character', 
      to_chain_class_id: 6,
      to_chain_type_id: 1,
  },
  6: { 
      from_chain_class_name: "",
      to_chain_class_type: 'character', 
      to_chain_class_id: 7,
      to_chain_type_id: 1, 
  },
  7: { 
      from_chain_class_name: "",
      to_chain_class_type: 'scene', 
      to_chain_class_id: 2,
      to_chain_type_id: 4
  },
  8: { 
      from_chain_class_name: "Nervape 3D",
      to_chain_class_type: 'character', 
      to_chain_class_id: 8,
      to_chain_type_id: 1
  },
  9: { 
      from_chain_class_name: "2022-04-27-16-48-12.280-mnft",
      to_chain_class_type: 'character', 
      to_chain_class_id: 9,
      to_chain_type_id: 1
  },
  10: { 
      from_chain_class_name: "mNFT-test-4",
      to_chain_class_type: 'character', 
      to_chain_class_id: 10,
      to_chain_type_id: 1
  },
  11: { 
      from_chain_class_name: "Nervape / Mirana Special",
      to_chain_class_type: 'character', 
      to_chain_class_id: 11,
      to_chain_type_id: 9 
  },
  12: { 
      from_chain_class_name: "nervape test nft",
      to_chain_class_type: 'character', 
      to_chain_class_id: 18,
      to_chain_type_id: 1
  },
  13: { 
      from_chain_class_name: "Magic Ball",
      to_chain_class_type: 'character', 
      to_chain_class_id: 14,
      to_chain_type_id: 1
  },
}


// 0x34d5b504e5b30b88843462146da44a92be0ed0830000000b Nervape / Mirana Special
// 0x34d5b504e5b30b88843462146da44a92be0ed0830000000a Nervape / B-Boat
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000009 Nervape / B-Book
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000008 Nervape / Story 001
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000007 Groovy Party
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000006 Nervape / GROOVY DeFier
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000005 Nervape / GROOVY Researcher
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000004 Nervape / GROOVY NFTer
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000003 Nervape / GROOVY Miner
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000002 Nervape / GROOVY Whale
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000001 Nervape / GROOVY Developer
// 0x34d5b504e5b30b88843462146da44a92be0ed08300000000 Nervape / GROOVY Rookie

const MAINNET_BRIDGING_CLASS_DICT: BridgingClassDict = {
  0: { 
      from_chain_class_name: "Nervape / GROOVY Rookie", 
      to_chain_class_type: 'character', 
      to_chain_class_id: 1,
      to_chain_type_id: 1
  },
  1: {
      from_chain_class_name: "Nervape / GROOVY Developer",
      to_chain_class_type: 'character', 
      to_chain_class_id: 2,
      to_chain_type_id: 1
  },
  2: { 
      from_chain_class_name: "Nervape / GROOVY Whale",
      to_chain_class_type: 'character', 
      to_chain_class_id: 3,
      to_chain_type_id: 1
  },
  3: { 
      from_chain_class_name: "Nervape / GROOVY Miner",
      to_chain_class_type: 'character', 
      to_chain_class_id: 4,
      to_chain_type_id: 1
  },
  4: { 
      from_chain_class_name: "Nervape / GROOVY NFTer",
      to_chain_class_type: 'character', 
      to_chain_class_id: 5,
      to_chain_type_id: 1
  },
  5: { 
      from_chain_class_name: "Nervape / GROOVY Researcher",
      to_chain_class_type: 'character', 
      to_chain_class_id: 6,
      to_chain_type_id: 1 
  },
  6: { 
      from_chain_class_name: "Nervape / GROOVY DeFier",
      to_chain_class_type: 'character', 
      to_chain_class_id: 7,
      to_chain_type_id: 1 
  },


  // [------------- scene -------------
  7: { 
      from_chain_class_name: "Groovy Party",
      to_chain_class_type: 'scene', 
      to_chain_class_id: 1,
      to_chain_type_id: 4
  },
  8: { 
      from_chain_class_name: "Nervape / Story 001",
      to_chain_class_type: 'scene', 
      to_chain_class_id: 2,
      to_chain_type_id: 4
  },
  // [------------- scene -------------]


  // [------------- item --------------
  9: { 
      from_chain_class_name: "Nervape / B-Book",
      to_chain_class_type: 'item', 
      to_chain_class_id: 1,
      to_chain_type_id: 3
  },
  10: { 
      from_chain_class_name: "Nervape / B-Boat",
      to_chain_class_type: 'item', 
      to_chain_class_id: 2,
      to_chain_type_id: 3
  },
  // ------------- item --------------]

  //[------------- special --------------
  11: { 
      from_chain_class_name: "Nervape / Mirana Special",
      to_chain_class_type: 'special', 
      to_chain_class_id: 1,
      to_chain_type_id: 9
  },
  //------------- special ---------------]



  //[------------- test --------------
  12: { 
      from_chain_class_name: "Nervape / BoBoBear / Orange",
      to_chain_class_type: 'character', 
      to_chain_class_id: 1,
      to_chain_type_id: 1
  },

  13: { 
      from_chain_class_name: "Nervape / BoBoBear / Purple",
      to_chain_class_type: 'character', 
      to_chain_class_id: 2,
      to_chain_type_id: 1
  },

  14: {
      from_chain_class_name: "BoBoBear’s Burger / Gold",
      to_chain_class_type: 'special', 
      to_chain_class_id: 1,
      to_chain_type_id: 9
  },

  15: {
      from_chain_class_name: "Sock / Beige",
      to_chain_class_type: 'item', 
      to_chain_class_id: 1,
      to_chain_type_id: 3
  },

  16: {
      from_chain_class_name: "Crystal Ball / White",
      to_chain_class_type: 'scene', 
      to_chain_class_id: 1,
      to_chain_type_id: 4
  }
  // -------------- test ---------------]
}

export const BRIDGING_CLASS_DICT = process.env.CHAIN_NETWORK === "mainnet" ? MAINNET_BRIDGING_CLASS_DICT : TESTNET_BRIDGING_CLASS_DICT

export const CONFIG = {
    CHAIN_NETWORK: process.env.CHAIN_NETWORK as string,
    MONGODB_CONNECTION_URL: process.env.MONGODB_CONNECTION_URL as string,
    CKB_NODE_RPC_URL: process.env.CKB_NODE_RPC_URL as string,
    CKB_INDEXER_RPC_URL: process.env.CKB_INDEXER_RPC_URL as string,
    
    MNFT_ISSUER_TYPE_CODE_HASH: process.env.MNFT_ISSUER_TYPE_CODE_HASH,
    MNFT_CLASS_TYPE_CODE_HASH: process.env.MNFT_CLASS_TYPE_CODE_HASH,
    MNFT_TYPE_CODE_HASH: process.env.MNFT_TYPE_CODE_HASH,
    NERVAPE_MNFT_ISSUER_ID: process.env.NERVAPE_MNFT_ISSUER_ID,


    LAYER_ONE_BRIDGE_ETH_ADDRESS: process.env.LAYER_ONE_BRIDGE_ETH_ADDRESS as string,
    LAYER_ONE_BRIDGE_CKB_ADDRESS: process.env.LAYER_ONE_BRIDGE_CKB_ADDRESS as string,

    GODWOKEN_RPC: process.env.GODWOKEN_RPC as string,
    GODWOKEN_CONTRACTS: {
        BRIDGE: process.env.GODWOKEN_NERVAPE_BRIDGE_CONTRACT as string
    },
    EVM_PRIVATE_KEY
}
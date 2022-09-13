import dotenv from 'dotenv';
import process from 'process'
import path from 'path'

dotenv.config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;

if (!EVM_PRIVATE_KEY) {
    throw new Error('You need to pass EVM_PRIVATE_KEY environment variable.');
}

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
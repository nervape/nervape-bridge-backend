import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;

if (!EVM_PRIVATE_KEY) {
    throw new Error('You need to pass EVM_PRIVATE_KEY environment variable.');
}

export const CONFIG = {
    CKB_NODE_RPC_URL: "https://testnet.ckb.dev/rpc",
    CKB_INDEXER_RPC_URL: "https://testnet.ckb.dev/indexer",
    IPFS_NODE: "http://localhost:5001",
    
    MNFT_ISSUER_TYPE_CODE_HASH: "0xb59879b6ea6fff985223117fa499ce84f8cfb028c4ffdfdf5d3ec19e905a11ed",
    MNFT_CLASS_TYPE_CODE_HASH: "0x095b8c0b4e51a45f953acd1fcd1e39489f2675b4bc94e7af27bb38958790e3fc",
    MNFT_TYPE_CODE_HASH: "0xb1837b5ad01a88558731953062d1f5cb547adf89ece01e8934a9f0aeed2d959f",

    // LAYER_ONE_BRIDGE_ETH_ADDRESS: '0xD173313A51f8fc37BcF67569b463abd89d81844f'
    LAYER_ONE_BRIDGE_ETH_ADDRESS: '0x72a55a5b52510c3ce74bb71a90ddfdf64bcc1634',

    EVM_RPC: 'https://godwoken-testnet-v1.ckbapp.dev',
    EVM_CONTRACTS: {
        BRIDGE: '0x54B8d8E2455946f2A5B8982283f2359812e815ce'
    },
    EVM_PRIVATE_KEY,

    DATA_LOCATION: '../data',    
}
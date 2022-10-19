import { connect } from 'mongoose';
import { BridgingStatus, BridgingTransaction } from "../types"
import { CONFIG } from '../config';

(async function main() {
    await connect(CONFIG.MONGODB_CONNECTION_URL);
    const tx = process.argv[2] as string
    console.log("query from_chain_tx_hash = ", tx)
    const dbTx = await BridgingTransaction.findOne({ from_chain_tx_hash: tx })
    if(!dbTx) {
        console.log("No BridgingTransaction found")
    } else {
        console.log(dbTx.toJSON())
    }
    process.exit()
})();
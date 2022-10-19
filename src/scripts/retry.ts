import { connect } from 'mongoose';
import { BridgingStatus, BridgingTransaction } from "../types"
import { CONFIG } from '../config';

(async function main() {
    await connect(CONFIG.MONGODB_CONNECTION_URL);
    const tx = process.argv[2] as string
    console.log("Query from_chain_tx_hash = ", tx)

    const dbTx = await BridgingTransaction.findOne({ from_chain_tx_hash: tx })
    if(!dbTx) {
      console.log("No BridgingTransaction found")
      process.exit()
    }
    const beforeStatus = dbTx.status
    dbTx.status = BridgingStatus.BRIDGING
    await dbTx.save()
    console.log("Update tx from %s to %s", beforeStatus, dbTx.status)
    process.exit()
})();
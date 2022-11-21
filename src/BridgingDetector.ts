import { Schema, model, connect } from 'mongoose';
import PWCore, { Address, ChainID, AddressType, CHAIN_SPECS, CkbIndexer, LockType, OutPoint, parseAddress, LumosConfigs } from "@lay2/pw-core";
import { CONFIG } from "./config";
import { CkbIndexerGroupedTransaction, BridgingStatus, BridgingTransaction } from "./types"
import { getBridgingTransactions } from "./rpc"


if(CONFIG.CHAIN_NETWORK === 'mainnet') {
  PWCore.setChainId(ChainID.ckb, CHAIN_SPECS.Lina)
} else {
  PWCore.setChainId(ChainID.ckb_testnet, CHAIN_SPECS.Aggron)
}
export class BridgingDetector {
    constructor(public address = new Address(
        CONFIG.LAYER_ONE_BRIDGE_ETH_ADDRESS,
        AddressType.eth,
        null,
        LockType.pw // LockType.pw
      )) 
    {}

    public async start() {
      await connect(CONFIG.MONGODB_CONNECTION_URL);

      while (true) {
        let transactions;
        try {
          transactions = await getBridgingTransactions(this.address);
        } catch(e) {
          console.error("RPC error: ", e)
          continue
        }

        for (const transaction of transactions) {
          const dbTx = await BridgingTransaction.findOne({ from_chain_tx_hash: transaction.tx_hash })
          if(!dbTx) {
            console.log("Find new bridging transaction: ", transaction.tx_hash)
            const tx = new BridgingTransaction({
              from_chain_block_number: transaction.block_number,
              from_chain_tx_hash: transaction.tx_hash,
              status: BridgingStatus.FROM_CHAIN_COMMITTED,
              submitted_at: Date.now()
            })
            await tx.save()
          }
        }
        await new Promise(r => setTimeout(r, 10000));
      }
    }
}

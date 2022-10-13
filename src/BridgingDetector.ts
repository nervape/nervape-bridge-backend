import { Schema, model, connect } from 'mongoose';
import PWCore, { Address, ChainID, AddressType, CHAIN_SPECS, CkbIndexer, LockType, OutPoint, parseAddress, LumosConfigs } from "@lay2/pw-core";
import { CONFIG } from "./config";
import { CkbIndexerGroupedTransaction, BridgingStatus, BridgingTransaction } from "./types"
import { getBridgingTransactions } from "./rpc"


if(CONFIG.CHAIN_NETWORK === 'mainnet') {
  PWCore.setChainId(ChainID.ckb, [CHAIN_SPECS.Lina, CHAIN_SPECS.Aggron][ChainID.ckb])
} else {
  PWCore.setChainId(ChainID.ckb_testnet, [CHAIN_SPECS.Lina, CHAIN_SPECS.Aggron][ChainID.ckb_testnet])
}
export class BridgingDetector {
    constructor(public address = new Address(
        CONFIG.LAYER_ONE_BRIDGE_ETH_ADDRESS,
        // CONFIG.LAYER_ONE_BRIDGE_CKB_ADDRESS,
        AddressType.eth,
        null,
        LockType.pw // LockType.pw
      )) {
      console.log(this.address.toCKBAddress())
    }

    public async start() {
      await connect(CONFIG.MONGODB_CONNECTION_URL);
      console.log("connected to database")

      while (true) {
        console.log('Searching for bridging transactions...');
        let transactions;
        try {
          transactions = await getBridgingTransactions(this.address);
        } catch(e) {
          console.log("RPC error = ", e)
          continue
        }

        console.log('Find %d bridging transactions', transactions.length);

        for (const transaction of transactions) {
          console.log("transaction=", transaction.tx_hash)
          const dbTx = await BridgingTransaction.findOne({ from_chain_tx_hash: transaction.tx_hash })
          if(!dbTx) {
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

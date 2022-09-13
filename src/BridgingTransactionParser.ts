import _ from 'lodash';
import { Schema, model, connect } from 'mongoose';
import { Address, Script as PWScript, AddressPrefix, HashType, AddressType, CkbIndexer, LockType, OutPoint, parseAddress, LumosConfigs } from "@lay2/pw-core";
import { CONFIG } from "./config";
import { logger } from "./logger";

import {
  molecule,
  number,
  createFixedBytesCodec,
  bytes,
  blockchain
} from "@ckb-lumos/codec";

import type {
  Cell,
  TransactionWithStatus,
  Script,
  Input
} from "@ckb-lumos/base/lib/api";

import { getTransactionWithStatus, getMultiTransactions } from "./rpc"
import { BridgingNFT, CkbIndexerGroupedTransaction, BridgingStatus, BridgingTransaction, BRIDGING_CLASS_DICT } from "./types"

const MNFTArgs = molecule.struct(
  {
    issuerId: createFixedBytesCodec({
      byteLength: 20,
      pack: (hex) => bytes.bytify(hex),
      unpack: (buf) => bytes.hexify(buf),
    }),
    classId: number.Uint32BE,
    tokenId: number.Uint32BE,
  },
  ["issuerId", "classId", "tokenId"]
);


const MNFT_TYPE_ARGS_LENGTH = 56;
const ETHEREUM_ADDRESS_LENGTH = 40;
const EXPECTED_ADDRESS_CELL_DATA_LENGTH = MNFT_TYPE_ARGS_LENGTH + ETHEREUM_ADDRESS_LENGTH + 2; // 2 for 0x    

class BridgingNFTs {
  readonly bridgingTokens: BridgingNFT[]
  readonly l2ReceivingAddress: string | null

  constructor(cells: Cell[], inputs: Input[]) {
    this.bridgingTokens = BridgingNFTs.getBridgingTokens(cells)
    this.l2ReceivingAddress = BridgingNFTs.getL2ReceivingAddress(cells)
  }

  static async getL1FromAddress(inputs: Input[]) {
    const txids = inputs.map(input => input.previous_output.tx_hash)
    const txs = await getMultiTransactions(txids)
    const transactions = txs.map(t => t.transaction)

    const outputs = inputs.map((input, index) => {
      return transactions[index].outputs[parseInt(input.previous_output.index)]
    })

    const addresses = outputs.map(output => {
      const { code_hash, args, hash_type } = output.lock
      return Address.fromLockScript(
        new PWScript(code_hash, args, hash_type as HashType), 
        CONFIG.CHAIN_NETWORK === "mainnet" ? AddressPrefix.Mainnet : AddressPrefix.Testnet
      ).addressString
    })
    const uniqAddrs = _.uniq(addresses)
    if(uniqAddrs.length > 1) throw Error("Multiple source addresses");
    return uniqAddrs[0]
  }
  static isMNFTCell(cell: Cell) {
    if(cell.cell_output.type && cell.cell_output.type.code_hash === CONFIG.MNFT_TYPE_CODE_HASH) {
      const { issuerId } = MNFTArgs.unpack(bytes.bytify(cell.cell_output.type.args))
      const { code_hash, args } = cell.cell_output.type
      return code_hash === CONFIG.MNFT_TYPE_CODE_HASH && issuerId === CONFIG.NERVAPE_MNFT_ISSUER_ID
    }
    return false
  }

  static getBridgingTokens(cells: Cell[]) {
    return cells.filter(cell => cell.cell_output.type && BridgingNFTs.isMNFTCell(cell)).map(cell => {
      const { issuerId, classId, tokenId } = MNFTArgs.unpack(bytes.bytify(cell.cell_output.type?.args || ''))
      if(!BRIDGING_CLASS_DICT[classId]) throw new Error("Invalid class id");
      
      return {
        from_chain_class_id: classId,
        from_chain_token_id: tokenId,
        to_chain_class_type: BRIDGING_CLASS_DICT[classId].to_chain_class_type,
        to_chain_token_id: BRIDGING_CLASS_DICT[classId].to_chain_class_id * 10000 + tokenId,
      }
    })
  }

  static getL2ReceivingAddress(cells: Cell[]): string | null {
    for(const cell of cells) {
      if(cell.data.length !== EXPECTED_ADDRESS_CELL_DATA_LENGTH) continue
      if(cell.data.slice(0, 42) !== CONFIG.NERVAPE_MNFT_ISSUER_ID) continue
      return `0x${cell.data.slice(MNFT_TYPE_ARGS_LENGTH + 2, EXPECTED_ADDRESS_CELL_DATA_LENGTH)}`;
    }
    return null
  }
}

export class BridgingTransactionParser {
    // constructor(public address = new Address(
    //     CONFIG.LAYER_ONE_BRIDGE_CKB_ADDRESS,
    //     AddressType.ckb,
    //     null,
    //     LockType.pw
    //   )) {
    // }

    async connectToDB() {
      await connect(CONFIG.MONGODB_CONNECTION_URL);
      console.log("connected to database")
    }

    async sleep() {
      await new Promise(r => setTimeout(r, 3000));
    }

    public async start() {
      await this.connectToDB()
      while (true) {
        const dbTx = await BridgingTransaction.findOne({ status: BridgingStatus.FROM_CHAIN_COMMITTED }).sort({ block_number: "desc" })
        if(!dbTx) {
          // console.debug("No bridging transaction found")
          await this.sleep() 
          continue
        }

        console.log("processing tx =", dbTx?.from_chain_tx_hash)

        const { transaction, tx_status } = await getTransactionWithStatus(dbTx.from_chain_tx_hash)
        if(tx_status.status !== 'committed') {
          console.log("transaction %s is not committed, status = %s", dbTx.from_chain_tx_hash, tx_status.status)
          await this.sleep() 
          continue
        }

        const cells = transaction.outputs.map((output, i) => {
          return {
            cell_output: { ... output },
            data: transaction.outputs_data[i]
          } as Cell
        })
        const bridgingNFTs = new BridgingNFTs(cells, transaction.inputs)

        if(bridgingNFTs.bridgingTokens.length > 0 && bridgingNFTs.l2ReceivingAddress) {
          const fromChainAddress = await BridgingNFTs.getL1FromAddress(transaction.inputs)
          dbTx.from_chain_address = fromChainAddress
          dbTx.tokens = bridgingNFTs.bridgingTokens
          dbTx.to_chain_address = bridgingNFTs.l2ReceivingAddress || undefined
          dbTx.status = BridgingStatus.BRIDGING
        } else {
          dbTx.status = BridgingStatus.FROM_CHAIN_INVALID
        }
        
        await dbTx.save()

        await this.sleep()
      }
    }
}
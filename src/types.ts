import { utils, OutPoint, Output, Input } from "@ckb-lumos/lumos";
import { Schema, model } from 'mongoose';


export type CkbIndexerGroupedTransaction = {
  block_number: string;
  cells: [string, string][];
  tx_hash: string;
  tx_index: string;
}

export enum BridgingStatus {
	FROM_CHAIN_COMMITTED = "FROM_CHAIN_COMMITTED",
	FROM_CHAIN_INVALID = "FROM_CHAIN_INVALID",
	BRIDGING  = "BRIDGING",
	TO_CHAIN_MINTING  = "TO_CHAIN_MINTING",
  TO_CHAIN_MINT_FAILED  = "TO_CHAIN_MINT_FAILED",
	BRIDGED  = "BRIDGED"
}

export interface CommittedTransaction {
  inputs: Input[];
  outputs: Output[];
  outputs_data: string[];
}

export interface BridgingNFT {
	from_chain_class_id: number;
	from_chain_token_id: number;
	to_chain_token_id: number;
}

export interface BridgingClassDict {
  [from_chain_class_id: number]: {
    to_chain_class_type: string, 
    to_chain_class_id: number
  }
}

export const BRIDGING_CLASS_DICT: BridgingClassDict = {
  12: { to_chain_class_type: 'character', to_chain_class_id: 18 },
  1: { to_chain_class_type: 'character', to_chain_class_id: 2 },
  2: { to_chain_class_type: 'character', to_chain_class_id: 3 },
  3: { to_chain_class_type: 'character', to_chain_class_id: 4 },
  4: { to_chain_class_type: 'character', to_chain_class_id: 5 },
  5: { to_chain_class_type: 'character', to_chain_class_id: 6 },
  6: { to_chain_class_type: 'character', to_chain_class_id: 7 },
  7: { to_chain_class_type: 'scene', to_chain_class_id: 2 },
}

export const BridgingTransaction = model('BridgingTransaction', new Schema({
  from_chain_block_number: Number,
  from_chain_tx_hash: String,
  to_chain_block_number: Number,
  to_chain_tx_hash: String,
  status: String,
  from_chain_address: String,
  to_chain_address: String,
  to_chain_error: String,
  submitted_at: Number,
  completed_at: Number,
  tokens: [{
    from_chain_class_id: Number,
    from_chain_token_id: Number,
    to_chain_class_type: String,
    to_chain_token_id: Number,
  }]
}));
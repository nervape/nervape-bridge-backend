import fetch from "node-fetch";
import type {
  TransactionWithStatus, Header
} from "@ckb-lumos/base/lib/api";
import { Address } from "@lay2/pw-core";

import { HttpsProxyAgent } from 'https-proxy-agent'

import { CONFIG } from "./config";
import { CkbIndexerGroupedTransaction } from "./types";

// For local test case
function getAgent() {
	return process.env.PROXY_URL ? new HttpsProxyAgent(process.env.PROXY_URL) : false
}

async function request(url: string, body: any) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
    agent: getAgent()
  });
  return await response.json()
}

export async function getTransactionWithStatus(hash?: string): Promise<TransactionWithStatus> {
  const requestBody = {
    id: 2,
    jsonrpc: "2.0",
    method: "get_transaction",
    params: [ hash ],
  };
  // const response = await fetch(CONFIG.CKB_NODE_RPC_URL, {
  //   method: "post",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(requestBody),
  //   agent: getAgent()
  // });

  // const data = await response.json();

  const data = await request(CONFIG.CKB_NODE_RPC_URL, JSON.stringify(requestBody))

  return data.result as TransactionWithStatus
}

export async function getMultiTransactions(hashes: string[]): Promise<TransactionWithStatus[]> {
    const requestBody = hashes.map((hash, index) => {
      return {
        id: index + 1,
        jsonrpc: "2.0",
        method: "get_transaction",
        params: [ hash ],
      }
    })
    // const response = await fetch(CONFIG.CKB_NODE_RPC_URL, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(requestBody),
    //   agent: getAgent()
    // });
    // const data = await response.json();

    const data = await request(CONFIG.CKB_NODE_RPC_URL, JSON.stringify(requestBody))
    return data.map((result: any) => result.result as TransactionWithStatus)
}

export async function getBridgingTransactions(address: Address): Promise<CkbIndexerGroupedTransaction[]> {
  const addressLockScript = address.toLockScript().serializeJson();
  const requestBody = {
    id: 1,
    jsonrpc: "2.0",
    method: "get_transactions",
    params: [
      {
        script: addressLockScript,
        script_type: "lock",
        group_by_transaction: true,
        filter: {
          code_hash: CONFIG.MNFT_TYPE_CODE_HASH,
          hash_type: "type",
          args: CONFIG.NERVAPE_MNFT_ISSUER_ID
        }
      },
      "desc",
      "0x64" // 100
    ]
  }
  // const response = await fetch(CONFIG.CKB_INDEXER_RPC_URL, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: requestBody,
  //   agent: getAgent()
  // });
  // const data = await response.json();
  const data = await request(CONFIG.CKB_INDEXER_RPC_URL, JSON.stringify(requestBody))

  const transactions = data.result.objects as CkbIndexerGroupedTransaction[];
  return transactions.filter(t => t.cells.filter(c => c[0] === "output").length >= 2)
}

export async function getHeader(hash: string | undefined) : Promise<Header> {
  const requestBody = {
    id: 2,
    jsonrpc: "2.0",
    method: "get_header",
    params: [ hash ],
  };

  const data = await request(CONFIG.CKB_NODE_RPC_URL, JSON.stringify(requestBody))

  return data.result as Header
}

export async function getTipBlockNumber(): Promise<number> {
  const requestBody = {
    id: 2,
    jsonrpc: "2.0",
    method: "get_tip_block_number",
    params: [],
  };

  const data = await request(CONFIG.CKB_NODE_RPC_URL, JSON.stringify(requestBody))

  return parseInt(data.result, 16)
} 
import {
  molecule,
  number,
  createFixedBytesCodec,
  bytes,
  blockchain
} from "@ckb-lumos/codec";
import { utils, OutPoint, Output, Input } from "@ckb-lumos/lumos";
import fetch from "node-fetch";

import { CONFIG } from "./config";
import { BytesCodec } from "@ckb-lumos/codec/lib/base";
import { concat } from "@ckb-lumos/codec/lib/bytes";
import { assertMinBufferLength, assertBufferLength } from "@ckb-lumos/codec/lib/utils";
import { Address, AddressPrefix, HashType, NervosAddressVersion, Script } from "@lay2/pw-core";
import { logger } from "ethers";

const { struct } = molecule;
const { Uint8, Uint16BE, Uint32BE } = number;

export function byteBEVecOf<T>(codec: BytesCodec<T>): BytesCodec<T> {
  return {
    pack(unpacked) {
      const payload = codec.pack(unpacked);
      const header = Uint16BE.pack(payload.byteLength);

      return concat(header, payload);
    },
    unpack(packed) {
      assertMinBufferLength(packed, 2);
      const header = Uint16BE.unpack(packed.slice(0, 2));
      assertBufferLength(packed.slice(2), header);
      return codec.unpack(packed.slice(2));
    },
  };
}


enum NFTCellConfigureFlags {
  Claimable,
  Lockability,
  Inscription,
  Reserved,
  ExchangeableBeforeClaim,
  ExchangeableAfterClaim,
  DestructibleBeforeClaim,
  DestructibleAfterClaim,
}

const NFTCell = struct(
  {
    version: Uint8,
    characteristic: createFixedBytesCodec({
      byteLength: 8,
      pack: (hex) => bytes.bytify(hex),
      unpack: (buf) => bytes.hexify(buf),
    }),
    configure: Uint8,
    state: Uint8,
  },
  ["version", "characteristic", "configure", "state"]
);

const NFTTypeArgs = struct(
  {
    issuerId: createFixedBytesCodec({
      byteLength: 20,
      pack: (hex) => bytes.bytify(hex),
      unpack: (buf) => bytes.hexify(buf),
    }),
    classId: Uint32BE,
    tokenId: Uint32BE,
  },
  ["issuerId", "classId", "tokenId"]
);

const NFTClassCellData = struct(
  {
    version: Uint8,
    total: Uint32BE,
    issued: Uint32BE,
    configure: Uint8,
  },
  ["version", "total", "issued", "configure"]
);

const NFTIssuerCellData = struct(
  {
    version: Uint8,
    classCount: Uint32BE,
    setCount: Uint32BE,
    infoSize: Uint16BE,
  },
  ["version", "classCount", "setCount", "infoSize"]
);

export type CkbIndexerCell = {
  block_number: string;
  out_point: OutPoint;
  output: Output;
  output_data: string;
  tx_index: string;
}

interface CommittedTransaction {
  inputs: Input[];
  outputs: Output[];
  outputs_data: string[];
}

const MNFT_TYPE_ARGS_LENGTH = 56;
const ETHEREUM_ADDRESS_LENGTH = 40;
const EXPECTED_ADDRESS_CELL_DATA_LENGTH = MNFT_TYPE_ARGS_LENGTH + ETHEREUM_ADDRESS_LENGTH + 2; // 2 for 0x    

// Map<Issuer Type Hash, Issuer Cell>
const ISSUER_CELLS_MAP = new Map<string, CkbIndexerCell>();

export class NFT {
  public nftClassCell?: CkbIndexerCell;
  public issuerCell?: CkbIndexerCell;

  constructor(
    public outpoint: OutPoint,
    public data: string,
    public typeScriptArguments: string
  ) {}

  get id() {
    return this.typeScriptArguments;
  }

  get outpointId() {
    return `${this.outpoint.tx_hash}#${this.outpoint.index}`;
  }

  getTypeScriptArguments() {
    return NFTTypeArgs.unpack(bytes.bytify(this.typeScriptArguments));
  }

  getData() {
    const data = NFTCell.unpack(bytes.bytify(this.data)); // { totalSupply: BI(21000000 * 10 ** 8), decimals: 8 }

    const configuredFlags = this.getConfigureFlags(data.configure);

    return { data, configuredFlags };
  }

  getClassData() {
    if (!this.nftClassCell) {
      throw new Error(`Class cell hasn't been fetched yet.`);
    }

    const fixedPart = this.nftClassCell.output_data.slice(0, 22);
    const data = NFTClassCellData.unpack(bytes.bytify(fixedPart));

    // read name
    const nameLengthParsed = Uint16BE.unpack('0x' + this.nftClassCell.output_data.slice(22, 26));
    const name = Buffer.from(bytes.bytify('0x' + this.nftClassCell.output_data.slice(26, 26 + nameLengthParsed * 2))).toString('utf8');
    let lastReadIndex = 26 + nameLengthParsed * 2;

    // read description
    const descriptionLengthParsed = Uint16BE.unpack('0x' + this.nftClassCell.output_data.slice(lastReadIndex, lastReadIndex + 4));
    const description = Buffer.from(bytes.bytify('0x' + this.nftClassCell.output_data.slice(lastReadIndex + 4, lastReadIndex + 4 + descriptionLengthParsed * 2))).toString('utf8');
    lastReadIndex = lastReadIndex + 4 + descriptionLengthParsed * 2;

    // read renderer
    const rendererLengthParsed = Uint16BE.unpack('0x' + this.nftClassCell.output_data.slice(lastReadIndex, lastReadIndex + 4));
    const renderer = Buffer.from(bytes.bytify('0x' + this.nftClassCell.output_data.slice(lastReadIndex + 4, lastReadIndex + 4 + rendererLengthParsed * 2))).toString('utf8');

    return { ...data, name, description, renderer };
  }

  getIssuerData() {
    if (!this.issuerCell) {
      throw new Error(`Issuer cell hasn't been fetched yet.`);
    }

    const fixedPart = this.issuerCell.output_data.slice(0, 24);
    const data = NFTIssuerCellData.unpack(bytes.bytify(fixedPart));

    let info: string | undefined = undefined;
    let infoJSON: any;
    if (data.infoSize > 0) {
      info = Buffer.from(bytes.bytify('0x' + this.issuerCell.output_data.slice(24, 24 + data.infoSize * 2))).toString('utf8');

      if (info.length > 0) {
        try {
          infoJSON = JSON.parse(info);
        } catch (error) {
          infoJSON = {};
        }
      } else {
        infoJSON = {};
      }
    }

    return { ...data, info: infoJSON };
  }


  getConfigureFlags(configureFlagMap: number): NFTCellConfigureFlags[] {
    const flags: NFTCellConfigureFlags[] = [];

    let flag: keyof typeof NFTCellConfigureFlags;
    for (flag in NFTCellConfigureFlags) {
      const value = NFTCellConfigureFlags[flag] as string | number;

      if (typeof value === "string") {
        continue;
      }

      if ((2 ** value) & configureFlagMap) {
        flags.push(value);
      }
    }

    return flags;
  }

  async getConnectedClass() {
    const requestBody = {
      id: 2,
      jsonrpc: "2.0",
      method: "get_cells",
      params: [
        {
          script: {
            code_hash: CONFIG.MNFT_CLASS_TYPE_CODE_HASH,
            hash_type: "type",
            args: this.typeScriptArguments.slice(0, 50),
          },
          script_type: "type",
        },
        "asc",
        "0x64",
      ],
    };
    const response = await fetch(CONFIG.CKB_INDEXER_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();

    // console.log({
    //   requestBody: JSON.stringify(requestBody),
    //   result: JSON.stringify(result)
    //  })

    if (result.result.objects.length !== 1) {
      throw new Error(`Can't find single NFT Class Cell.`);
    }

    this.nftClassCell = result.result.objects[0];
  }

  async getConnectedIssuer(): Promise<void> {
    if (this.issuerCell) {
      return;
    }
    
    const typeArgs = this.getTypeScriptArguments();

    const cachedIssuerCell = ISSUER_CELLS_MAP.get(typeArgs.issuerId);

    if (cachedIssuerCell) {
      // console.log('return issuer from cache', {
      //   cachedIssuerCell
      // });
      this.issuerCell = cachedIssuerCell;
      return;
    }

    // console.log({ typeArgs })
    const requestBody = {
      id: 2,
      jsonrpc: "2.0",
      method: "get_cells",
      params: [
        {
          script: {
            code_hash: CONFIG.MNFT_ISSUER_TYPE_CODE_HASH,
            hash_type: "type",
            args: '0x'
          },
          script_type: "type",
        },
        "asc",
        "0x6666",
      ],
    };
    const response = await fetch(CONFIG.CKB_INDEXER_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();

    let issuerCell: CkbIndexerCell | undefined;
    for (const currentIssuerCell of result.result.objects) {
      const scriptHash = utils.computeScriptHash(currentIssuerCell.output.type);
      const scriptHashBeginning = scriptHash.slice(0, 42);

      if (scriptHashBeginning === typeArgs.issuerId) {
        // console.log(currentIssuerCell);
        issuerCell = currentIssuerCell as CkbIndexerCell;
        ISSUER_CELLS_MAP.set(typeArgs.issuerId, issuerCell);
        break;
      }
    }

    // console.log({
    //   requestBody: JSON.stringify(requestBody),
    //   result: JSON.stringify(result),
    //   resultLength: result.result.objects.length,
    //  })

    this.issuerCell = issuerCell;

    if (!issuerCell) {
      throw new Error(`Can't find mNFT Issuer cell.`);
    }
  }

  async getCommittedTransaction(transactionHash: string): Promise<CommittedTransaction> {
    if (transactionHash.length !== 66) {
      throw new Error(`Transaction hash length is invalid in getCommittedTransaction. Expected string of length 66, got: ${transactionHash.length}.`);
    }
    
    const requestBody = {
      id: 2,
      jsonrpc: "2.0",
      method: "get_transaction",
      params: [transactionHash],
    };
    const response = await fetch(CONFIG.CKB_NODE_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();

    if (result?.result?.tx_status?.status !== 'committed') {
      throw new Error(`Transaction not in "committed" status. Transaction hash: "${transactionHash}".`);
    }

    return result?.result?.transaction;
  }

  async getReceivingEthereumAddress(): Promise<string | null> {
    const transaction = await this.getCommittedTransaction(this.outpoint.tx_hash);

    if (!await this.assertTransactionHasSingleSender(transaction)) {
      logger.debug(`Can't get Receiving Ethereum Address. Transaction has multiple senders. Can't trust the output is coming from single mNFT sender.`)
    }

    /** 
     * Transaction output should at least contain 2 cells:
     * 1. mNFT cell
     * 2. mNFT Receiving Ethereum Address cell (cell with no lock, only data with full mNFT id and Ethereum address)
     */
    if (transaction.outputs.length < 2) {
      logger.debug(`Can't get Receiving Ethereum Address. Transaction with mNFT transfer has less than 2 outputs.`);
      return null;
    }    

    for (const transactionInput of transaction.inputs) {
      const previousOutputTransaction = await this.getCommittedTransaction(transactionInput.previous_output.tx_hash);
      const previousOutput = previousOutputTransaction.outputs[parseInt(transactionInput.previous_output.index, 16)];

      if (!previousOutput) {
        throw new Error(`Can't find previous output when fetching Receiving Ethereum Address.`);
      }

      if (previousOutput.type?.code_hash === CONFIG.MNFT_TYPE_CODE_HASH && previousOutput.type.args === this.typeScriptArguments) {
        logger.debug('Found mNFT transfer previous output.');

        if (previousOutput.lock.code_hash === CONFIG.UNIPASS_V2_CODE_HASH) {
          logger.debug('Detected Unipass V2 lock. Searching for Receiving Ethereum Address Cell...');

          for (const [index, output] of transaction.outputs.entries()) {
            const outputData = transaction.outputs_data[index];

            
            if (!output.type && outputData?.length === EXPECTED_ADDRESS_CELL_DATA_LENGTH && outputData.slice(0, MNFT_TYPE_ARGS_LENGTH + 2) === this.typeScriptArguments) {
              return `0x${outputData.slice(MNFT_TYPE_ARGS_LENGTH + 2, EXPECTED_ADDRESS_CELL_DATA_LENGTH)}`;
            }
          }
        }
      }
    }

    return null;
  }

  private async assertTransactionHasSingleSender(transaction: CommittedTransaction): Promise<boolean> {
    if (transaction.inputs.length === 0) {
      throw new Error(`Transaction must have at least 1 input.`);
    }

    let previousSenderAddress: string | null = null;
    for (const transactionInput of transaction.inputs) {
      const previousOutputTransaction = await this.getCommittedTransaction(transactionInput.previous_output.tx_hash);
      const previousOutput = previousOutputTransaction.outputs[parseInt(transactionInput.previous_output.index, 16)];

      const senderAddress = Address.fromLockScript(
        new Script(previousOutput.lock.code_hash, previousOutput.lock.args, previousOutput.lock.hash_type as HashType),
        AddressPrefix.Testnet,
        NervosAddressVersion.latest
      );

      if (previousSenderAddress === null) {
        previousSenderAddress = senderAddress.addressString;
      } else if (previousSenderAddress !== senderAddress.addressString) {
        return false;
      }
    }

    return true;
  }
}

import {
  molecule,
  number,
  createFixedBytesCodec,
  bytes,
  blockchain
} from "@ckb-lumos/codec";
import { BI, Script, helpers, utils, OutPoint, Output } from "@ckb-lumos/lumos";
import fetch from "node-fetch";

import { CONFIG } from "./config";
import { BytesCodec } from "@ckb-lumos/codec/lib/base";
import { concat } from "@ckb-lumos/codec/lib/bytes";
import { assertMinBufferLength, assertBufferLength } from "@ckb-lumos/codec/lib/utils";

const { struct, byteArrayOf, vector, byteVecOf, option, table } = molecule;
const { Uint8, Uint16, Uint16LE, Uint16BE, Uint32, Uint32BE, Uint32LE, Uint64 } = number;
const {  } = bytes;
const { Bytes, BytesOpt } = blockchain;

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

const UTF8String = byteBEVecOf<string>({
  pack: (str) => Uint8Array.from(Buffer.from(str, "utf8")),
  unpack: (buf) => Buffer.from(buf).toString("utf8"),
});

const DescOpt = option(UTF8String);

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

// const NFTTypeArgs = struct(
//   {
//     issuerId: createFixedBytesCodec({
//       byteLength: 20,
//       pack: (hex) => bytes.bytify(hex),
//       unpack: (buf) => bytes.hexify(buf),
//     }),
//     classId: Uint32BE,
//     tokenId: Uint32BE,
//   },
//   ["issuerId", "classId", "tokenId"]
// );

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


// type NFTCellUnpackType = typeof NFTCell.unpack;
// type NFTCellUnpackReturnType = ReturnType<NFTCellUnpackType>;

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
}

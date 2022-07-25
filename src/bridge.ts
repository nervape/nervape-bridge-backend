import { Address, AddressType, CkbIndexer, LockType, OutPoint } from "@lay2/pw-core";
import fetch from "node-fetch";

import { CONFIG } from "./config";
import { CkbIndexerCell, NFT } from "./nft";
import { MetadataStorage } from "./storage";

enum NFTBridgingStatus {
    Pending,
    Bridged
}

export class Bridge {
    public NFTStatuses = new Map<string, NFTBridgingStatus>();

    constructor(public address = new Address(
        CONFIG.BRIDGE_ETH_ADDRESS,
        AddressType.eth,
        null,
        LockType.pw
      ), private storage = new MetadataStorage()) {
    }

    public async initialize() {
      await this.storage.initialize();
    }

    public async start() {
        const nfts = await this.getPendingNFTs();
        // console.log({
        //     nfts
        // });

        for (const nft of nfts) {
          if (this.shouldBridgeNFT(nft)) { 
            await this.bridgeNFT(nft);

            // break; // stop after 1
          }
        }
    }

    async bridgeNFT(nft: NFT) {
        console.log(`Bridging NFT with id: ${nft.id}`);
        // console.log(`NFTCell data:`, nft.getData());

        const metadata = await this.prepareStableNFTMetadata(nft);
        // console.log(`NFT metadata: `, metadata);
        const cid = await this.storage.storeFile(JSON.stringify(metadata));
        console.log(`Stored with CID in IPFS: ${cid}`);
        // console.log(`NFT type args: `, nft.getTypeScriptArguments());
        await nft.getConnectedIssuer();

        // await nft.getConnectedClass();
        // console.log(nft.getClassData());

        this.markNFTAsBridged(nft);
    }

    getPendingNFTs(): Promise<NFT[]> {
        return this.getNFTsAtAddress(this.address);
    }

    shouldBridgeNFT(nft: NFT) {
      return !this.NFTStatuses.get(nft.id) || this.NFTStatuses.get(nft.id) === NFTBridgingStatus.Pending;
    }

    markNFTAsBridged(nft: NFT) {
      this.NFTStatuses.set(nft.id, NFTBridgingStatus.Bridged)
    }

    async prepareStableNFTMetadata(nft: NFT) {
      const nftCellData = nft.getData();

      await nft.getConnectedClass();

      const classData = nft.getClassData();

      return {
        name: classData.name,
        description: classData.description,
        image: classData.renderer,
        ...nftCellData.data,
        raw: nft.data,
        typescriptArguments: { ...nft.getTypeScriptArguments(), raw: nft.typeScriptArguments },
      };
    }

    async prepareNFTMetadata(nft: NFT) {
      const nftCellData = nft.getData();

      await nft.getConnectedClass();
      await nft.getConnectedIssuer();

      return {
        ...nftCellData.data,
        raw: nft.data,
        typescriptArguments: { ...nft.getTypeScriptArguments(), raw: nft.typeScriptArguments },
        classData: {...nft.getClassData(), raw: nft.nftClassCell?.output_data},
        issuerData: { ...nft.getIssuerData(), raw: nft.issuerCell?.output_data }
      }
    }

    async getNFTsAtAddress(address: Address): Promise<NFT[]> {
        console.log(`Searching for mNFTs at address: ${address.toCKBAddress()}`);
        const addressLockScript = address.toLockScript().serializeJson();
        const response = await fetch(CONFIG.CKB_INDEXER_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: 2,
            jsonrpc: "2.0",
            method: "get_cells",
            params: [
              {
                script: addressLockScript,
                script_type: "lock",
              },
              "asc",
              "0x64",
            ],
          }),
        });
        const result = await response.json();
      
        return (result.result.objects as CkbIndexerCell[])
          .filter(o => o.output.type?.code_hash === CONFIG.MNFT_TYPE_CODE_HASH)
          .map(
            o => {
              if (!o.output.type) {
                throw new Error(`NFT has missing Type Script arguments.`);
              } 

              return new NFT(o.out_point, o.output_data, o.output.type?.args)
            }
          );
      }
}

/**
 * NFT minted on L2:
 * 
 * Data in IPFS:
 * {
 *  version: 0,
 *  characteristic: '0x0135b6bfbd85fc9a',
 *  configure: 192,
 *  state: 0
 * }
 */
import { Address, AddressType, CkbIndexer, LockType, OutPoint } from "@lay2/pw-core";
import fetch from "node-fetch";

import { CONFIG } from "./config";
import { EVMBridge } from "./EVMBridge";
import { CkbIndexerCell, NFT } from "./nft";
import { MetadataStorage } from "./storage";

enum NFTBridgingStatus {
    Pending,
    Bridged
}

export class Bridge {
    public NFTStatuses = new Map<string, NFTBridgingStatus>();

    constructor(public address = new Address(
        CONFIG.LAYER_ONE_BRIDGE_ETH_ADDRESS,
        AddressType.eth,
        null,
        LockType.pw
      ), private storage = new MetadataStorage(), private evmBridge = new EVMBridge()) {
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

        const receiverEthereumAddress = await nft.getReceivingEthereumAddress();
        // console.log({
        //   receiverEthereumAddress
        // });

        if (!receiverEthereumAddress) {
          console.log(`Can't bridge NFT. No Receiving Ethereum Address found. [NFT ID: "${nft.id}"]`);
          return;
        }

        const typeScriptArgs = nft.getTypeScriptArguments();
        if (await this.evmBridge.isClassContractCreated(typeScriptArgs.issuerId, typeScriptArgs.classId)) {
          console.log(`MNFTClassContract already created.`);
        } else {
          const issuerAndClassId = nft.typeScriptArguments.slice(0, 50);
          console.log(`Deploying MNFTClassContract for issuerAndClassId: ${issuerAndClassId}`);
          await this.evmBridge.deployAndRegisterClassContract(issuerAndClassId, typeScriptArgs.issuerId, typeScriptArgs.classId);
        }

        if (await this.evmBridge.isNFTMintedAlready(typeScriptArgs.issuerId, typeScriptArgs.classId, typeScriptArgs.tokenId)) {
          console.log('NFT minted already');
        } else {
          const metadata = await this.prepareStableNFTMetadata(nft);
          // console.log(`NFT metadata: `, metadata);
          const cid = await this.storage.storeFile(JSON.stringify(metadata));
          console.log(`Stored with CID in IPFS: ${cid}`);

          // mint
          const receipt = await this.evmBridge.mintNFT(typeScriptArgs.issuerId, typeScriptArgs.classId, typeScriptArgs.tokenId, receiverEthereumAddress, cid.toString());

          if (typeof(receipt) !== 'boolean') {
            console.log(`Minted NFT on EVM side. Transaction hash: ${receipt.transactionHash}`);
          }
        }

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

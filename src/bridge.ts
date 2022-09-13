import { Address, AddressType, CkbIndexer, LockType, OutPoint, parseAddress, LumosConfigs } from "@lay2/pw-core";
import fetch from "node-fetch";

import { CONFIG } from "./config";
import { EVMBridge } from "./EVMBridge";
import { logger } from "./logger";
import { CkbIndexerCell, NFT } from "./nft";
import { MetadataStorage } from "./storage";

import { helpers, config } from "@ckb-lumos/lumos";


enum NFTBridgingStatus {
    Pending,
    Invalid,
    Bridged,
}

export class Bridge {
    public NFTStatuses = new Map<string, NFTBridgingStatus>();

    constructor(public address = new Address(
        // CONFIG.LAYER_ONE_BRIDGE_ETH_ADDRESS,
        CONFIG.LAYER_ONE_BRIDGE_CKB_ADDRESS,
        AddressType.ckb,
        null,
        LockType.pw
      ), private storage = new MetadataStorage(), private evmBridge = new EVMBridge()) {

      // console.log(LumosConfigs[1])
      // const config = LumosConfigs[1]
      const script = helpers.addressToScript("ckt1q3uljza4azfdsrwjzdpea6442yfqadqhv7yzfu5zknlmtusm45hpuqwt3cvvkfuwjf6gj4fsgcwuu234sd9pyrsqs02amv", { config: config.predefined.AGGRON4 })
      console.log(script)
    }

    public async initialize() {
      await this.storage.initialize();
    }

    public async start() {
      while (true) {
        logger.debug('Starting new search for pending mNFTs...');
        const nfts = await this.getPendingNFTs();

        if (nfts.length !== 0) {
          logger.info(`Found ${nfts.length} mNFTs to be processed.`);
        }

        // for (const nft of nfts) {
        //   await this.bridgeNFT(nft);
        // }

        await new Promise(r => setTimeout(r, 300000));
      }
    }

    async bridgeNFT(nft: NFT) {
        logger.debug(`Checking status of mNFT with id: ${nft.id}`);

        const receiverEthereumAddress = await nft.getReceivingEthereumAddress();

        if (!receiverEthereumAddress) {
          logger.info(`Can't bridge NFT. No Receiving Ethereum Address found. [NFT ID: "${nft.id}"]`);
          this.NFTStatuses.set(nft.id, NFTBridgingStatus.Invalid);
          return;
        }

        const typeScriptArgs = nft.getTypeScriptArguments();
        if (await this.evmBridge.isClassContractCreated(typeScriptArgs.issuerId, typeScriptArgs.classId)) {
          logger.debug(`MNFTClassContract already created.`);
        } else {
          const issuerAndClassId = nft.typeScriptArguments.slice(0, 50);
          logger.info(`Deploying MNFTClassContract for issuerAndClassId: ${issuerAndClassId}`);
          await this.evmBridge.deployAndRegisterClassContract(issuerAndClassId, typeScriptArgs.issuerId, typeScriptArgs.classId);
        }

        if (await this.evmBridge.isNFTMintedAlready(typeScriptArgs.issuerId, typeScriptArgs.classId, typeScriptArgs.tokenId)) {
          logger.debug('NFT minted already');
        } else {
          const metadata = await this.prepareStableNFTMetadata(nft);
          // console.log(`NFT metadata: `, metadata);
          const cid = await this.storage.storeFile(JSON.stringify(metadata));
          logger.debug(`Stored with CID in IPFS: ${cid}`);

          // mint
          const receipt = await this.evmBridge.mintNFT(typeScriptArgs.issuerId, typeScriptArgs.classId, typeScriptArgs.tokenId, receiverEthereumAddress, cid.toString());

          if (typeof(receipt) !== 'boolean') {
            logger.info(`Minted NFT on EVM side. Transaction hash: ${receipt.transactionHash}`);
          }
        }

        this.NFTStatuses.set(nft.id, NFTBridgingStatus.Bridged);
    }

    async getPendingNFTs(): Promise<NFT[]> {
        const list = await this.getNFTsAtAddress(this.address);

        return list.filter(i => this.isNFTPendingCheck(i));
    }

    isNFTPendingCheck(nft: NFT) {
      return !this.NFTStatuses.get(nft.id) || this.NFTStatuses.get(nft.id) === NFTBridgingStatus.Pending;
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
        logger.debug(`Searching for mNFTs at address: ${address.toCKBAddress()}`);
        const addressLockScript = address.toLockScript().serializeJson();
        console.log(addressLockScript)
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
              "desc",
              "0x64",
            ],
          }),
        });
        const result = await response.json();

        console.log(JSON.stringify(result.result.objects))

        const args = result.result.objects.map((o: CkbIndexerCell) => o.output.type?.args)
        console.log('result', args)
      
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

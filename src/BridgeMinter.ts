import { providers, Contract, ContractFactory, constants, Wallet, ContractReceipt } from 'ethers';
import { connect } from 'mongoose';
import BridgeMinterAbi from "./artifacts/BridgeMinter.json"
import { BridgingStatus, BridgingTransaction } from "./types"
import { CONFIG } from './config';


export class BridgeMinter {
    public bridgeContract: Contract;

    private provider: providers.JsonRpcProvider;
    private wallet?: Wallet;

    constructor() {
        this.provider = new providers.JsonRpcProvider(CONFIG.GODWOKEN_RPC);
        this.wallet = new Wallet(CONFIG.EVM_PRIVATE_KEY, this.provider);
        this.bridgeContract = new Contract(CONFIG.GODWOKEN_CONTRACTS.BRIDGE, BridgeMinterAbi, this.wallet);
    }

    private async sleep() {
      await new Promise(r => setTimeout(r, 3000));
    }

    public async start() {
      await connect(CONFIG.MONGODB_CONNECTION_URL);
      console.log("connected to database")

      while (true) {
        const dbTx = await BridgingTransaction.findOne({ status: BridgingStatus.BRIDGING }).sort({ block_number: "desc" })
        if(!dbTx) {
          await this.sleep() 
          continue
        }

        dbTx.status = BridgingStatus.TO_CHAIN_MINTING
        await dbTx.save()

        console.log("process tx = ", dbTx.from_chain_tx_hash)
        
        const characterIds = dbTx.tokens.filter(t => t.to_chain_class_type === 'character').map(t => t.to_chain_token_id || 0)
        const sceneIds = dbTx.tokens.filter(t => t.to_chain_class_type === 'scene').map(t => t.to_chain_token_id || 0)
        const itemIds = dbTx.tokens.filter(t => t.to_chain_class_type === 'item').map(t => t.to_chain_token_id || 0)
        const specialIds = dbTx.tokens.filter(t => t.to_chain_class_type === 'special').map(t => t.to_chain_token_id || 0)
        const toAddress = dbTx.to_chain_address || ''

        console.log("tokenIds = ", characterIds, sceneIds, itemIds, specialIds)

        try {
            const receipt = await this.mintMany(toAddress, characterIds, sceneIds, itemIds, specialIds)
            if(receipt.status) {
                dbTx.status = BridgingStatus.BRIDGED
                dbTx.to_chain_block_number = receipt.blockNumber
                dbTx.to_chain_tx_hash = receipt.transactionHash
                dbTx.completed_at = Date.now()
                await dbTx.save()
            }
        } catch(error: any) {
            // retry in next loop if `noNetwork` 
            if(error?.event === 'noNetwork') {
                dbTx.status = BridgingStatus.BRIDGING
                await dbTx.save()
                await this.sleep()
                continue
            }
            const reason = error?.reason || error.message
            console.log(error)
            dbTx.status = BridgingStatus.TO_CHAIN_MINT_FAILED
            dbTx.to_chain_error = reason
            await dbTx.save()
        }
      }
    }

    async mintMany(toAddress: string, characterIds: number[], sceneIds: number[], itemIds: number[], specialIds: number[]): Promise<ContractReceipt> {
        const tx = await this.bridgeContract.mintMany(toAddress, characterIds, sceneIds, itemIds, specialIds)
        const receipt = await tx.wait();
        return receipt;
    }
}
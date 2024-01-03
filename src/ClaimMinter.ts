import { providers, Contract, ContractFactory, constants, Wallet, ContractReceipt } from 'ethers';
import { connect } from 'mongoose';
import BridgeMinterAbi from "./artifacts/NervapePhysical.json"
import { ClaimStatus, PhysicalNftClaim } from "./types"
import { CONFIG } from './config';


export class ClaimMinter {
    public claimContract: Contract;

    private provider: providers.JsonRpcProvider;
    private wallet?: Wallet;

    constructor() {
        this.provider = new providers.JsonRpcProvider(CONFIG.ETH_PRC);
        this.wallet = new Wallet(CONFIG.EVM_PRIVATE_KEY, this.provider);
        this.claimContract = new Contract(CONFIG.NERVAPE_PHYSICAL_CONTRACT, BridgeMinterAbi, this.wallet);
    }

    private async sleep() {
      await new Promise(r => setTimeout(r, 3000));
    }

    public async start() {
      await connect(CONFIG.MONGODB_CONNECTION_URL);
      while (true) {
            const dbClaim = await PhysicalNftClaim.findOne({ used: true, status: ClaimStatus.PENDING }).sort({ submitted_at: "asc" })

            if(!dbClaim) {
              await this.sleep() 
              continue
            }

            dbClaim.status = ClaimStatus.MINTING
            await dbClaim.save()

            const tokenId = dbClaim.token_id as number
            const to = dbClaim.address as string

            console.log("start mint = ", tokenId, to)
            try {
                const receipt = await this.mint(tokenId, to)
                if(receipt.status) {
                    dbClaim.status = ClaimStatus.MINTED
                    dbClaim.claim_block_number = receipt.blockNumber
                    dbClaim.claim_tx_hash = receipt.transactionHash
                    dbClaim.completed_at = Date.now()
                    await dbClaim.save()
                    console.log("completed = ", tokenId, to)
                }
            } catch(error: any) {
                console.error(error)
                // retry in next loop if `noNetwork` 
                if(error?.event === 'noNetwork') {
                    dbClaim.status = ClaimStatus.PENDING
                    await dbClaim.save()
                    await this.sleep()
                    continue
                }
                const reason = error?.reason || error.message
                dbClaim.status = ClaimStatus.FAILED
                dbClaim.claim_error = reason
                await dbClaim.save()
            }
        }
    }

    async mint(tokenId: number, toAddress: string): Promise<ContractReceipt> {
        const tx = await this.claimContract.mint(tokenId, toAddress)
        console.log("tx = ", tx, tokenId, toAddress)
        const receipt = await tx.wait();
        return receipt;
    }
}
import { providers, Contract, ContractFactory, constants, Wallet, ContractReceipt } from 'ethers';
import { MNFTBridgeABI } from './artifacts/MNFTBridgeArtifact';
import { MNFTClassContractABI, MNFTClassContractBytecode } from './artifacts/MNFTClassContractArtifact';
import { CONFIG } from './config';
import { logger } from './logger';

export class EVMBridge {
    public bridgeContract?: Contract;

    private provider: providers.JsonRpcProvider;
    private wallet?: Wallet;

    constructor() {
        this.provider = new providers.JsonRpcProvider(CONFIG.EVM_RPC);
        this.connectPrivateKey();
    }

    connectPrivateKey() {
        this.wallet = new Wallet(CONFIG.EVM_PRIVATE_KEY, this.provider);
        this.bridgeContract = new Contract(CONFIG.EVM_CONTRACTS.BRIDGE, MNFTBridgeABI, this.wallet);
    }

    async getRegisteredClassContractAddress(issuerId: string, classId: number): Promise<string> {
        if (!this.bridgeContract) {
            throw new Error('bridgeContract is missing');
        }

        const registeredContract = await this.bridgeContract.getRegisteredClassContract(issuerId, classId);

        return registeredContract;
    }

    async isClassContractCreated(issuerId: string, classId: number) {
        return await this.getRegisteredClassContractAddress(issuerId, classId) !== constants.AddressZero;
    }

    async deployClassContract(issuerId: string, classId: number) {
        if (!this.wallet) {
            throw new Error('wallet undefined');
        }

        const factory = new ContractFactory(MNFTClassContractABI, MNFTClassContractBytecode, this.wallet);
        const contract = await factory.deploy(`MNFT-${issuerId}-${classId}`, `MNFT`, issuerId, classId);

        return contract;
    }

    async deployAndRegisterClassContract(issuerAndClassIdHash: string, issuerId: string, classId: number) {
        if (!this.bridgeContract) {
            throw new Error('bridgeContract is missing');
        }

        const nftContract = await this.deployClassContract(issuerId, classId);

        const tx = await this.bridgeContract.registerNFTClassContract(issuerAndClassIdHash, nftContract.address);

        await tx.wait();

        return nftContract;
    }

    async getNFTClassContract(issuerId: string, classId: number) {
        const isClassRegistered = await this.isClassContractCreated(issuerId, classId);

        if (!isClassRegistered) {
            return null;
        }

        const classAddress = await this.getRegisteredClassContractAddress(issuerId, classId);
        logger.info(`MNFTClassContract address: ${classAddress}`);
        return new Contract(classAddress, MNFTClassContractABI, this.wallet);
    }

    async isNFTMintedAlready(issuerId: string, classId: number, tokenId: number): Promise<boolean> {
        const contract = await this.getNFTClassContract(issuerId, classId);

        if (!contract) {
            return false;
        }

        try {
            const owner = await contract.ownerOf(tokenId);

            return owner !== constants.AddressZero;
        } catch (error: any) {
            // console.log(error.message)

            if (error?.message?.includes('ERC721: invalid token ID')) {
                return false;
            }

            throw error;
        }
    }

    async mintNFT(issuerId: string, classId: number, tokenId: number, toAddress: string, metadataURI: string): Promise<boolean | ContractReceipt> {
        const contract = await this.getNFTClassContract(issuerId, classId);

        if (!contract || await this.isNFTMintedAlready(issuerId, classId, tokenId)) {
            return false;
        }

        const tx = await contract.safeMint(toAddress, tokenId, metadataURI);
        const receipt = await tx.wait(2);

        return receipt;
    }
}
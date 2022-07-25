import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { CONFIG } from './config';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

export class MetadataStorage {
    public initialized = false;

    private client: IPFSHTTPClient;

    constructor() {
        this.client = create({ url: CONFIG.IPFS_NODE });
    }

    async initialize() {
        if (this.initialized) {
            return;
        }
        
        await this.checkAndCreateDataDirectory();
        this.initialized = true;
    }

    getDataPath() {
        return path.join(__dirname, CONFIG.DATA_LOCATION);
    }

    async checkAndCreateDataDirectory() {
        const dataPath = this.getDataPath();
        try {
            await access(dataPath);
        } catch (error) {
            await mkdir(dataPath);
        }
    }

    async storeFile(content: string) {
        const { cid } = await this.client.add(content, {
            onlyHash: true,
            cidVersion: 1
        });

        const filePath = path.join(__dirname, `../data/${cid}.json`);
        let existingFileLocally: Buffer | null = null;

        try {
            existingFileLocally = await readFile(filePath);
        } catch (error) {}

        if (!existingFileLocally) {
            await writeFile(filePath, content);
        }

        let fileExistsInIPFS = false;
        try {
            const existingFileInIPFS = await this.client.cat(cid, {
                timeout: 10000
            });

            const resultsFromIPFS = [];
            for await (const chunk of existingFileInIPFS) {
                resultsFromIPFS.push(chunk);
            }

            fileExistsInIPFS = true;
        } catch (error) {
            // console.log(`File ${cid}.json doesn't exist in IPFS.`);
        }

        if (!fileExistsInIPFS) {
            await this.client.add(content, {
                cidVersion: 1
            });
            console.log(`Uploaded ${cid}.json to IPFS.`);
        }

        return cid;
    }
}
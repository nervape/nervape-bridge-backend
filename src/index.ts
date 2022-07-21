import PWCore, {
  Address,
  Amount,
  AddressType,
  RawProvider,
  IndexerCollector,
  Platform,
  LockType,
  OutPoint,
} from "@lay2/pw-core";
import { Bridge } from "./bridge";
import { CONFIG } from "./config";

const PRIVATE_KEY =
  "0xd9066ff9f753a1898709b568119055660a77d9aae4d7a4ad677b8fb3d2a571e5";

(async function main() {
  const provider = new RawProvider(PRIVATE_KEY, Platform.eth, LockType.pw);
  const collector = new IndexerCollector(CONFIG.CKB_INDEXER_RPC_URL); // A Collector to retrive cells from the CKB Indexer RPC.
  const pwcore = await new PWCore(CONFIG.CKB_NODE_RPC_URL).init(provider, collector);

  const bridge = new Bridge();
  bridge.start();

  // const nftsAtBridgeAddress = await detectNFTsAtAddress(bridgeAddress);

  // console.log({
  //   nftsLength: nftsAtBridgeAddress[4].id,
  // });

  // mint nfts on the Godwoken side
})();

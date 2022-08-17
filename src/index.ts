import PWCore, {
  RawProvider,
  IndexerCollector,
  Platform,
  LockType,
} from "@lay2/pw-core";
import { Bridge } from "./bridge";
import { CONFIG } from "./config";

(async function main() {
  const provider = new RawProvider(CONFIG.EVM_PRIVATE_KEY, Platform.eth, LockType.pw);
  const collector = new IndexerCollector(CONFIG.CKB_INDEXER_RPC_URL);
  await new PWCore(CONFIG.CKB_NODE_RPC_URL).init(provider, collector);

  const bridge = new Bridge();
  await bridge.initialize();
  await bridge.start();
})();

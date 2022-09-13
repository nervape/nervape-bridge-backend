import { BridgingTransactionParser } from "../BridgingTransactionParser";

(async function main() {
  const parser = new BridgingTransactionParser();
  await parser.start();
})();
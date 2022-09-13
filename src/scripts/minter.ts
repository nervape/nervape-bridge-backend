import { BridgeMinter } from "../BridgeMinter";

(async function main() {
  const minter = new BridgeMinter();
  await minter.start();
})();
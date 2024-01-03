import { ClaimMinter } from "../ClaimMinter";

(async function main() {
  const minter = new ClaimMinter();
  await minter.start();
})();
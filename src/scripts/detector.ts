import { BridgingDetector } from "../BridgingDetector";

(async function main() {
  const detector = new BridgingDetector();
  await detector.start();
})();

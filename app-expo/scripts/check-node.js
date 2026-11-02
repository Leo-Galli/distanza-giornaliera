/* Exits non-zero (with a friendly message) when Node.js is too old for React Native 0.88 / Expo SDK 58.
   Required: ^20.19.4 || ^22.13.0 || >=24.3.0 (taken from react-native's package.json). */
const [maj, min, pat] = process.versions.node.split('.').map(Number);
const ok =
  (maj === 20 && (min > 19 || (min === 19 && pat >= 4))) ||
  (maj === 22 && min >= 13) ||
  (maj === 24 && min >= 3) ||
  maj >= 25;
if (!ok) {
  console.error(`[ERROR] Node.js ${process.versions.node} is too old or unsupported. Install Node 20.19.4+, 22.13+ or 24.3+ (LTS) from https://nodejs.org and run again.`);
  process.exit(1);
}

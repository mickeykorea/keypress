/**
 * Merges arm64 and x64 build artifacts into a single latest-mac.yml.
 *
 * electron-updater on macOS always fetches latest-mac.yml regardless of arch.
 * It then filters the files array: if running on arm64 and any URL contains
 * "arm64", it picks that file. Otherwise it picks the non-arm64 file.
 *
 * Run after both `build:silicon` and `build:intel` have completed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dist = path.join(__dirname, '..', 'dist');
const version = require('../package.json').version;

function sha512Base64(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(data).digest('base64');
}

const arm64Zip = path.join(dist, `Keypress-${version}-arm64-mac.zip`);
const x64Zip = path.join(dist, `Keypress-${version}-mac.zip`);

if (!fs.existsSync(arm64Zip)) throw new Error(`Missing: ${arm64Zip}`);
if (!fs.existsSync(x64Zip)) throw new Error(`Missing: ${x64Zip}`);

const arm64Hash = sha512Base64(arm64Zip);
const arm64Size = fs.statSync(arm64Zip).size;
const x64Hash = sha512Base64(x64Zip);
const x64Size = fs.statSync(x64Zip).size;

const yml = `version: ${version}
files:
  - url: Keypress-${version}-arm64-mac.zip
    sha512: ${arm64Hash}
    size: ${arm64Size}
  - url: Keypress-${version}-mac.zip
    sha512: ${x64Hash}
    size: ${x64Size}
path: Keypress-${version}-mac.zip
sha512: ${x64Hash}
releaseDate: '${new Date().toISOString()}'
`;

const outPath = path.join(dist, 'latest-mac.yml');
fs.writeFileSync(outPath, yml);
console.log(`Wrote ${outPath} with both arm64 and x64 entries.`);

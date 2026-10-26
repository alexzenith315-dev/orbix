// Copies compiled ABIs into the frontend so the UI uses the exact compiled interfaces.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "..", "src", "abi");
fs.mkdirSync(out, { recursive: true });
for (const name of ["OrbixNFT", "OrbixMarketplace"]) {
  const artifact = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "contracts", `${name}.sol`, `${name}.json`), "utf8"));
  fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(artifact.abi, null, 2) + "\n");
  console.log(`wrote src/abi/${name}.json (${artifact.abi.length} entries)`);
}

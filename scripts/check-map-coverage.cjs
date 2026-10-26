// Manual public-service check; not part of npm test and never calls SerpApi or a billing API.
const fs = require("node:fs");
const path = require("node:path");
const { createLoader } = require("./test-helpers.cjs");
const load = createLoader();
const { CITIES } = load("src/lib/cities.ts");
const { satelliteTile } = load("src/lib/map-data.ts");
const sharp = require("sharp");
const https = require("node:https");

function readTile(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => request.destroy(new Error("tile deadline exceeded")), 30000);
    const request = https.get(url, { family: 4, headers: { "Accept": "image/png", "Accept-Encoding": "identity" } }, (response) => {
      const chunks = []; let size = 0;
      response.on("data", (chunk) => { size += chunk.length; if (size > 4 * 1024 * 1024) request.destroy(new Error("tile too large")); else chunks.push(chunk); });
      response.on("error", reject);
      response.on("end", () => { clearTimeout(timer); resolve({ status: response.statusCode, contentType: response.headers["content-type"], buffer: Buffer.concat(chunks) }); });
    });
    request.on("error", (error) => { clearTimeout(timer); reject(error); });
  });
}

(async () => {
  const reportFile = path.join("data", "map-coverage-check.json");
  const previous = process.argv.includes("--retry-failed") && fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")).results : [];
  const results = previous.filter((result) => result.ok);
  const pending = CITIES.filter((city) => !results.some((result) => result.cityId === city.id));
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (pending.length) {
      const city = pending.shift(), tile = satelliteTile(city);
      const result = { cityId: city.id, lat: city.lat, lon: city.lon, tileX: tile?.x, tileY: tile?.y, ok: false };
      try {
        if (!tile) throw new Error("outside coverage");
        const response = await readTile(tile.url);
        result.status = response.status;
        result.contentType = response.contentType;
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
        const buffer = response.buffer;
        const image = sharp(buffer), metadata = await image.metadata(), stats = await image.stats();
        result.width = metadata.width; result.height = metadata.height;
        result.ok = metadata.format === "png" && metadata.width === 256 && metadata.height === 256
          && stats.channels[0].max > stats.channels[0].min && (!metadata.hasAlpha || stats.channels[3].max > 0);
      } catch (error) { result.error = error.message; }
      results.push(result);
    }
  }));
  results.sort((a, b) => a.cityId.localeCompare(b.cityId));
  const report = { checkedAt: new Date().toISOString(), provider: "ESA WorldCover 2021 / Terrascope public WMTS", results };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", "map-coverage-check.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ successful: results.filter((item) => item.ok).length, total: results.length,
    failed: results.filter((item) => !item.ok), report: path.resolve("data/map-coverage-check.json") }));
  if (results.some((item) => !item.ok)) process.exitCode = 1;
})().catch(() => { console.error("Harita kapsam kontrolü tamamlanamadı."); process.exitCode = 1; });

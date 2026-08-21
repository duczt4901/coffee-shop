import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "public/images/south-vietnam-context.svg");
const outputPath = join(root, "public/images/south-vietnam-knockout.svg");
const source = await readFile(sourcePath, "utf8");
const sourceBody = source.slice(
    source.indexOf("<style>"),
    source.lastIndexOf("</svg>"),
);
const lamDongPath = source.match(
    /<path id="lam-dong-shape"[^>]*\sd="([^"]+)"[^>]*\/>/,
);

if (!lamDongPath) {
    throw new Error("south-vietnam-context.svg is missing #lam-dong-shape");
}

const width = 2400;
const height = 1200;
const mapTransform = "translate(552.7 74.2) scale(.828)";
const knockoutSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="context-fade" x1="0" y1="0" x2="0" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="black" />
      <stop offset=".14" stop-color="white" />
      <stop offset=".82" stop-color="white" />
      <stop offset="1" stop-color="black" />
    </linearGradient>
    <mask id="map-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="url(#context-fade)" />
    </mask>
    <mask id="lam-dong-hole" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="white" />
      <g transform="${mapTransform}">
        <path d="${lamDongPath[1]}" fill="black" stroke="none" />
      </g>
    </mask>
  </defs>
  <rect width="${width}" height="${height}" fill="#f4f1ea" mask="url(#lam-dong-hole)" />
  <g transform="${mapTransform}" mask="url(#map-fade)">
    ${sourceBody}
  </g>
</svg>`;

await writeFile(outputPath, knockoutSvg.trimStart(), "utf8");

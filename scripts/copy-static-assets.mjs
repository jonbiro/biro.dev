import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { content } from "../assets/content.js";

await mkdir("dist/client/assets", { recursive: true });
await copyFile("assets/og.jpg", "dist/client/assets/og.jpg");
await copyFile("assets/favicon.svg", "dist/client/assets/favicon.svg");
await copyFile("assets/headshot-placeholder.svg", "dist/client/assets/headshot-placeholder.svg");
await mkdir("dist/client/assets/fonts", { recursive: true });
await copyFile("assets/fonts/LICENSE-Sora.txt", "dist/client/assets/fonts/LICENSE-Sora.txt");
await copyFile("assets/fonts/LICENSE-Space-Grotesk.txt", "dist/client/assets/fonts/LICENSE-Space-Grotesk.txt");
const projectAssets = new Set(
  content.projects
    .flatMap((project) => [project.imageUrl, ...(project.gallery ?? []).map((image) => image.src)])
    .filter((path) => typeof path === "string" && path.startsWith("assets/projects/")),
);

for (const assetPath of projectAssets) {
  const outputPath = `dist/client/${assetPath}`;
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(assetPath, outputPath);
}
await copyFile("site.webmanifest", "dist/client/site.webmanifest");
await copyFile("robots.txt", "dist/client/robots.txt");
await copyFile("sitemap.xml", "dist/client/sitemap.xml");

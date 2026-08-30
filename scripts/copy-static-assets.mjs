import { copyFile, mkdir } from "node:fs/promises";

await mkdir("dist/client/assets", { recursive: true });
await copyFile("assets/og.png", "dist/client/assets/og.png");

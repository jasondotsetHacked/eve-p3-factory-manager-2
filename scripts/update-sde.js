import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SDE_BASE_URL = "https://developers.eveonline.com/static-data";
const LATEST_URL = `${SDE_BASE_URL}/tranquility/latest.jsonl`;
const LATEST_ZIP_URL = `${SDE_BASE_URL}/eve-online-static-data-latest-jsonl.zip`;
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEV_SDE_DIR = join(PROJECT_ROOT, "dev", "sde");
const DOWNLOAD_DIR = join(DEV_SDE_DIR, "downloads");
const EXTRACT_DIR = join(DEV_SDE_DIR, "extracted");
const GENERATED_DIR = join(PROJECT_ROOT, "src", "data", "sde", "generated");

const DEFAULT_FILES = [
  "types.jsonl",
  "planetSchematics.jsonl",
  "planetSchematicsTypeMap.jsonl",
  "planetSchematicsPinMap.jsonl",
];

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": process.env.EVE_USER_AGENT || "PIFactoryManager/0.1.0 (+https://github.com/)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseLatestBuild(jsonl) {
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const record = JSON.parse(line);
    if (record._key === "sde") {
      return record._value;
    }
  }

  throw new Error("Could not find _key=sde in latest.jsonl");
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": process.env.EVE_USER_AGENT || "PIFactoryManager/0.1.0 (+https://github.com/)",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(destination));
}

function extractJsonl(zipPath, fileName, destination) {
  const result = spawnSync("unzip", ["-p", zipPath, fileName], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 200,
  });

  if (result.status !== 0) {
    throw new Error(`Could not extract ${fileName}. Make sure the system 'unzip' command is available.`);
  }

  return writeFile(destination, result.stdout);
}

async function main() {
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  await mkdir(EXTRACT_DIR, { recursive: true });
  await mkdir(GENERATED_DIR, { recursive: true });

  const latestJsonl = await fetchText(LATEST_URL);
  const build = parseLatestBuild(latestJsonl);
  const zipPath = join(DOWNLOAD_DIR, `eve-online-static-data-${build}-jsonl.zip`);

  try {
    await readFile(zipPath);
  } catch {
    console.log(`Downloading SDE JSONL build ${build}...`);
    await downloadFile(LATEST_ZIP_URL, zipPath);
  }

  const extractedFiles = [];
  for (const fileName of DEFAULT_FILES) {
    const destination = join(EXTRACT_DIR, fileName);
    console.log(`Extracting ${fileName}...`);
    await extractJsonl(zipPath, fileName, destination);
    extractedFiles.push({
      name: fileName,
      localPath: `dev/sde/extracted/${fileName}`,
    });
  }

  const manifest = {
    build,
    updatedAt: new Date().toISOString(),
    source: LATEST_ZIP_URL,
    archive: `dev/sde/downloads/${basename(zipPath)}`,
    files: extractedFiles,
  };

  await writeFile(join(GENERATED_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Updated ${join("src", "data", "sde", "generated", "manifest.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

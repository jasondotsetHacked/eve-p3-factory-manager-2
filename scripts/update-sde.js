import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const SDE_BASE_URL = "https://developers.eveonline.com/static-data";
const LATEST_URL = `${SDE_BASE_URL}/tranquility/latest.jsonl`;
const LATEST_ZIP_URL = `${SDE_BASE_URL}/eve-online-static-data-latest-jsonl.zip`;
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEV_SDE_DIR = join(PROJECT_ROOT, "dev", "sde");
const DOWNLOAD_DIR = join(DEV_SDE_DIR, "downloads");
const EXTRACT_DIR = join(DEV_SDE_DIR, "extracted");
const ARCHIVE_EXTRACT_DIR = join(DEV_SDE_DIR, "archive");
const GENERATED_DIR = join(PROJECT_ROOT, "src", "data", "sde", "generated");
const PI_PIN_GROUP_IDS = new Set([1027, 1028, 1029, 1030]);

const DEFAULT_FILES = [
  "types.jsonl",
  "planetSchematics.jsonl",
  "planetResources.jsonl",
  "mapPlanets.jsonl",
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
      return record.buildNumber ?? record._value;
    }
  }

  throw new Error("Could not find an SDE build number in latest.jsonl");
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

async function commandExists(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "ignore",
  });

  return result.status === 0;
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }

  throw new Error("Could not find ZIP central directory.");
}

function findZipEntry(buffer, requestedFileName) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory entry.");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (fileName === requestedFileName || fileName.endsWith(`/${requestedFileName}`)) {
      return {
        fileName,
        compressionMethod,
        compressedSize,
        localHeaderOffset,
      };
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`Could not find ${requestedFileName} in SDE archive.`);
}

async function extractWithNativeZip(zipPath, fileName, destination) {
  const buffer = await readFile(zipPath);
  const entry = findZipEntry(buffer, fileName);
  const localHeaderOffset = entry.localHeaderOffset;

  if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.fileName}.`);
  }

  const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  let content;

  if (entry.compressionMethod === 0) {
    content = compressed;
  } else if (entry.compressionMethod === 8) {
    content = inflateRawSync(compressed);
  } else {
    throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.fileName}.`);
  }

  await writeFile(destination, content);
}

function extractWithStdout(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 300,
  });
}

async function extractArchiveWithPowerShell(zipPath, build) {
  const buildExtractDir = join(ARCHIVE_EXTRACT_DIR, String(build));
  await mkdir(buildExtractDir, { recursive: true });

  const command = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const result = spawnSync(
    command,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      zipPath,
      buildExtractDir,
    ],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  if (result.status !== 0) {
    return null;
  }

  return buildExtractDir;
}

async function extractJsonl(zipPath, fileName, destination, build) {
  try {
    await extractWithNativeZip(zipPath, fileName, destination);
    return;
  } catch (error) {
    console.warn(`Native ZIP extraction failed for ${fileName}: ${error.message}`);
  }

  if (await commandExists("unzip")) {
    const result = extractWithStdout("unzip", ["-p", zipPath, fileName]);
    if (result.status === 0) {
      await writeFile(destination, result.stdout);
      return;
    }
  }

  if (await commandExists("tar", ["--version"])) {
    const result = extractWithStdout("tar", ["-xOf", zipPath, fileName]);
    if (result.status === 0) {
      await writeFile(destination, result.stdout);
      return;
    }
  }

  const extractedDir = await extractArchiveWithPowerShell(zipPath, build);
  if (extractedDir) {
    const content = await readFile(join(extractedDir, fileName), "utf8");
    await writeFile(destination, content);
    return;
  }

  throw new Error(
    `Could not extract ${fileName}. Install 'unzip', ensure 'tar' supports zip archives, or run on Windows with PowerShell Expand-Archive available.`,
  );
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writePiLookups() {
  const types = await readJsonl(join(EXTRACT_DIR, "types.jsonl"));
  const schematics = await readJsonl(join(EXTRACT_DIR, "planetSchematics.jsonl"));
  const planetResources = await readJsonl(join(EXTRACT_DIR, "planetResources.jsonl"));
  const relevantTypeIds = new Set();

  for (const schematic of schematics) {
    for (const pinTypeId of schematic.pins ?? []) {
      relevantTypeIds.add(pinTypeId);
    }

    for (const schematicType of schematic.types ?? []) {
      relevantTypeIds.add(schematicType._key);
    }
  }

  for (const resource of planetResources) {
    if (resource.typeID) {
      relevantTypeIds.add(resource.typeID);
    }
    if (resource.type_id) {
      relevantTypeIds.add(resource.type_id);
    }
  }

  const typeNames = {};
  const typeGroups = {};
  const typeVolumes = {};
  const typeCapacities = {};
  for (const type of types) {
    if (relevantTypeIds.has(type._key) || PI_PIN_GROUP_IDS.has(type.groupID)) {
      typeNames[type._key] = type.name?.en ?? `Type ${type._key}`;
      typeGroups[type._key] = type.groupID;
      if (type.volume !== undefined) {
        typeVolumes[type._key] = type.volume;
      }
      if (type.capacity !== undefined) {
        typeCapacities[type._key] = type.capacity;
      }
    }
  }

  const schematicLookups = {};
  for (const schematic of schematics) {
    schematicLookups[schematic._key] = {
      name: schematic.name?.en ?? `Schematic ${schematic._key}`,
      cycleTime: schematic.cycleTime,
      pins: schematic.pins ?? [],
      types: (schematic.types ?? []).map((type) => ({
        typeId: type._key,
        name: typeNames[type._key] ?? `Type ${type._key}`,
        isInput: type.isInput,
        quantity: type.quantity,
      })),
    };
  }

  await writeFile(
    join(GENERATED_DIR, "pi-lookups.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        typeNames,
        typeGroups,
        typeVolumes,
        typeCapacities,
        schematics: schematicLookups,
      },
      null,
      2,
    )}\n`,
  );
}

async function main() {
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  await mkdir(EXTRACT_DIR, { recursive: true });
  await mkdir(ARCHIVE_EXTRACT_DIR, { recursive: true });
  await mkdir(GENERATED_DIR, { recursive: true });

  const latestJsonl = await fetchText(LATEST_URL);
  const build = parseLatestBuild(latestJsonl);
  if (!build) {
    throw new Error(`Invalid SDE build number from ${LATEST_URL}`);
  }

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
    await extractJsonl(zipPath, fileName, destination, build);
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

  await writePiLookups();
  await writeFile(join(GENERATED_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Updated ${join("src", "data", "sde", "generated", "manifest.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

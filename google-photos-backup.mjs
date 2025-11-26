#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import extract from "extract-zip";

/**
 * Search for ZIP files matching the pattern takeout-*-[number].zip
 */
async function findZipFiles(sourcePath) {
  console.log("\nSearching for ZIP files...");

  const files = await fs.readdir(sourcePath);
  const pattern = /^takeout-.+-(\d+)\.zip$/;

  const matchingFiles = files
    .filter((file) => pattern.test(file))
    .map((file) => ({
      filename: file,
      name: path.parse(file).name,
      fullPath: path.join(sourcePath, file),
      number: file.match(pattern)[1],
    }));

  if (matchingFiles.length) {
    for (const file of matchingFiles) {
      console.log(`  → Found - ${JSON.stringify(file.filename)}`);
    }
  }

  return matchingFiles;
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath, extractPath) {
  console.log(`  → Extracting ${zipPath} to ${extractPath}...`);

  try {
    await extract(zipPath, { dir: extractPath });
    console.log("    → ZIP extraction complete");
  } catch (err) {
    console.error("🔴 Failed to extract ZIP:", err);
  }
}

/**
 * Recursively unnecessary files ("*.json", "__MACOSX" and ".DS_Store") from a directory
 */
async function removeUnnecessaryFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "__MACOSX") {
        await deleteItem(fullPath);
      } else {
        await removeUnnecessaryFiles(fullPath);
      }
    } else if (
      entry.isFile() &&
      (path.extname(entry.name) === ".json" || entry.name === ".DS_Store")
    ) {
      await deleteItem(fullPath);
    }
  }
}

/**
 * Move contents from one directory to another
 */
async function moveContents(source, destination) {
  console.log(`  → Moving contents...`);

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    // const sourcePath = path.join(source, entry.name);
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    await fs.rename(sourcePath, destPath);

    console.log(`    → Moved: ${sourcePath} → ${destPath}/`);
  }
}

/**
 * Clean up temporary directory
 */
async function deleteItem(path) {
  try {
    await fs.rm(path, { recursive: true, force: true });
    console.log(`    → Deleted ${path}`);
  } catch (err) {
    console.warn(`ℹ️ Unable to delete item ${path}`);
  }
}

/**
 * Create directory if it doesn't exist
 */
async function createDirectory(basePath, name) {
  const directory = path.join(basePath, name);
  await fs.mkdir(directory, { recursive: true });
  console.log(`  → Created directory: ${directory}`);

  return directory;
}

/**
 * Process a Zip file
 */
async function processZipFile(zipInfo, sourcePath, destPath) {
  const { filename, name, fullPath, number } = zipInfo;
  console.log(`\nProcessing: ${filename}`);

  // Create temporary directory for extraction
  const tempDir = await createDirectory(sourcePath, name);

  try {
    await extractZip(fullPath, sourcePath);

    console.log(`  → Checking if there are unnecessary files to be deleted...`);
    await removeUnnecessaryFiles(tempDir);

    // Create destination directory
    const finalDestDir = await createDirectory(destPath, number);
    await moveContents(
      path.resolve(tempDir, "Takeout/Google Fotos"),
      finalDestDir
    );
  } finally {
    // Clean up temporary directory
    await deleteItem(tempDir);
  }
}

async function main() {
  // Check command line arguments
  if (process.argv.length < 4) {
    console.error("Usage: node script.js <source_path> <destination_path>");
    process.exit(1);
  }

  const sourcePath = path.resolve(process.argv[2]);
  const destPath = path.resolve(process.argv[3]);

  console.log("\n");
  console.log("=".repeat(60));
  console.log("Google Photos Backup Processor");
  console.log("=".repeat(60));
  console.log(`From: ${sourcePath}`);
  console.log(`To: ${destPath}`);

  // Check if source path exists
  try {
    await fs.access(sourcePath);
  } catch (err) {
    console.error(`\n 🔴 Error: Source path does not exist: ${sourcePath}`);
    process.exit(1);
  }

  // Create destination path if it doesn't exist
  await fs.mkdir(destPath, { recursive: true });

  // Search for ZIP files
  const zipFiles = await findZipFiles(sourcePath);

  if (!zipFiles.length) {
    console.log(
      `ℹ️ No ZIP files found in ${sourcePath} matching the pattern *-XX.zip`
    );

    return;
  }

  // Process each file
  for (const zipInfo of zipFiles) {
    try {
      await processZipFile(zipInfo, sourcePath, destPath);
    } catch (err) {
      console.error(`🔴 Error processing ${zipInfo.filename}:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🟢 Backup completed!");
  console.log("=".repeat(60));
}

// Main entry point
main().catch((err) => {
  console.error("🔴 Fatal Error:", err);
  process.exit(1);
});

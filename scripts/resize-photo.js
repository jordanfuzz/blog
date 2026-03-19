#!/usr/bin/env node
/**
 * Resizes a single photo in /photos to a specified width.
 * Optionally converts the file to JPEG.
 *
 * Usage: node resize-photo.js <filename> <width> [--to-jpg]
 *
 * Examples:
 *   node resize-photo.js harbor-ice.jpg 800
 *   node resize-photo.js screenshot.png 1200 --to-jpg
 */

import sharp from 'sharp';
import { writeFile, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PHOTOS_DIR = join(__dirname, '../photos');

const args = process.argv.slice(2);
const toJpg = args.includes('--to-jpg');
const [filename, widthArg] = args.filter(a => !a.startsWith('--'));

if (!filename || !widthArg) {
  console.error('Usage: node resize-photo.js <filename> <width> [--to-jpg]');
  process.exit(1);
}

const width = parseInt(widthArg, 10);
if (isNaN(width) || width <= 0) {
  console.error(`Invalid width: ${widthArg}`);
  process.exit(1);
}

const ext = extname(filename).toLowerCase();
const filePath = join(PHOTOS_DIR, filename);
const image = sharp(filePath);
const { width: currentWidth } = await image.metadata();

const converting = toJpg && ext !== '.jpg' && ext !== '.jpeg';
const outFilename = converting ? `${basename(filename, ext)}.jpg` : filename;
const outPath = join(PHOTOS_DIR, outFilename);

if (currentWidth <= width && !converting) {
  console.log(`${filename} is already ${currentWidth}px wide — nothing to do.`);
  process.exit(0);
}

const label = converting ? `${filename} → ${outFilename}` : filename;
process.stdout.write(`${label}: ${currentWidth}px → ${width}px ... `);

let pipeline = image.resize(width, null, { withoutEnlargement: true });
if (toJpg) {
  pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
}

const buf = await pipeline.toBuffer();
await writeFile(outPath, buf);
if (converting) await unlink(filePath);
console.log('done');

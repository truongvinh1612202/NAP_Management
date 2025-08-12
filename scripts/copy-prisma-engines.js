import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const prismaEnginesSource = path.join(projectRoot, 'node_modules', '@prisma', 'engines');
const generatedClientSource = path.join(projectRoot, 'generated');

console.log('Copying Prisma engines and generated client...');
console.log('Source engines:', prismaEnginesSource);
console.log('Source client:', generatedClientSource);

// This script ensures the Prisma engines and generated client are available
// for electron-builder to copy to extraResources

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Check if sources exist
if (!fs.existsSync(prismaEnginesSource)) {
  console.error('Prisma engines not found at:', prismaEnginesSource);
  process.exit(1);
}

if (!fs.existsSync(generatedClientSource)) {
  console.error('Generated Prisma client not found at:', generatedClientSource);
  console.log('Run "npx prisma generate" first');
  process.exit(1);
}

console.log('Prisma engines and client found. electron-builder will copy them to extraResources.');
console.log('Build completed successfully!');

import fs from "fs-extra";
import path from "path";
import replace from "replace-in-file";
import { fileURLToPath } from "url";

// fix long prisma loading times caused by scanning from process.cwd(), which returns "/" when run in electron
// (thus it scans all files on the computer.) See https://github.com/prisma/prisma/issues/8484
const __filename = path.join(fileURLToPath(import.meta.url), "..");
const __dirname = path.dirname(__filename);

const files = path.join(__dirname, "generated", "client", "**/*.js");
console.log("looking at files ", files);
const results = replace.sync({
  files: files,
  from: /process.cwd\(\)/g,
  to: `require('electron').app.getAppPath()`,
  countMatches: true,
});
console.log("Replacement results:", results);

// Copy the generated prisma client to the dist folder
fs.copySync(
  path.join(__dirname, "generated"),
  path.join(__dirname, "dist", "generated"),
  {
    filter: (src, dest) => {
      // Include all files - engines will be handled separately
      return true;
    },
  }
);

// Ensure Prisma engines are copied for production build
const enginesSource = path.join(__dirname, "node_modules", "@prisma", "engines");
const enginesTarget = path.join(__dirname, "dist", "node_modules", "@prisma", "engines");

if (fs.existsSync(enginesSource)) {
  console.log("Copying Prisma engines to dist folder...");
  fs.ensureDirSync(enginesTarget);
  
  // Copy specific engine files
  const engineFiles = [
    "query_engine-windows.dll.node",
    "libquery_engine-darwin.dylib.node", 
    "libquery_engine-darwin-arm64.dylib.node",
    "libquery_engine-debian-openssl-1.1.x.so.node",
    "schema-engine-windows.exe",
    "schema-engine-darwin",
    "schema-engine-darwin-arm64",
    "schema-engine-debian-openssl-1.1.x"
  ];
  
  engineFiles.forEach(file => {
    const sourcePath = path.join(enginesSource, file);
    const targetPath = path.join(enginesTarget, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copySync(sourcePath, targetPath);
      console.log(`Copied engine: ${file}`);
    }
  });
  
  console.log("Prisma engines copied successfully");
} else {
  console.warn("Prisma engines source not found:", enginesSource);
}

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
      // Prevent duplicate copy of query engine. It will already be in extraResources in electron-builder.yml
      if (
        src.match(/query_engine/) ||
        src.match(/libquery_engine/) ||
        src.match(/esm/)
      ) {
        return false;
      }
      return true;
    },
  }
);

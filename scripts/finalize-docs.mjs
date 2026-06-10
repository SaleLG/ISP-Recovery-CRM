import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, "..", "docs");

const remove = (name) => {
  const p = path.join(docsDir, name);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`Removed: ${name}`);
  }
};

const rename = (from, to) => {
  const src = path.join(docsDir, from);
  const dest = path.join(docsDir, to);
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(src, dest);
  console.log(`Renamed: ${from} → ${to}`);
};

const removeDir = (name) => {
  const p = path.join(docsDir, name);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`Removed folder: ${name}`);
  }
};

try {
  remove("ISP_CRM_User_Guide.docx");
  remove("ISP_CRM_Example_Scenario.docx");
  remove("ISP_CRM_User_Guide_updated.docx");
  remove("ISP_CRM_Example_Scenario_updated.docx");
  remove("ISP_CRM_Example_Scenario_NEW.docx");
  removeDir("new");

  execSync("npm run docs:user-guide", { stdio: "inherit", cwd: path.join(__dirname, "..") });
  execSync("npm run docs:scenario", { stdio: "inherit", cwd: path.join(__dirname, "..") });

  console.log("\nDocs folder is ready:");
  for (const name of fs.readdirSync(docsDir)) {
    if (name.endsWith(".docx") && !name.startsWith("~$")) {
      console.log(`  docs/${name}`);
    }
  }
} catch (err) {
  if (err?.code === "EBUSY" || err?.code === "EPERM") {
    console.error(
      "\nSome document files are open in Word or the editor. Close them and run:\n  npm run docs:finalize"
    );
    process.exit(1);
  }
  throw err;
}

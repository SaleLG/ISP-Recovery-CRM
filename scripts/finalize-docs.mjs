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

try {
  remove("ISP_CRM_User_Guide.docx");
  remove("ISP_CRM_User_Guide_updated.docx");
  remove("ISP_CRM_Example_Scenario.docx");
  remove("ISP_CRM_Workflow_Reference.docx");
  remove("ISP_CRM_Client_Step_by_Step_Guide.docx");
  remove("ISP_CRM_Example_Scenario_updated.docx");
  remove("ISP_CRM_Example_Scenario_NEW.docx");

  execSync("npm run docs:user-guide", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  console.log("\nDocs folder is ready:");
  for (const name of fs.readdirSync(docsDir)) {
    if (name.endsWith(".docx") && !name.startsWith("~$")) {
      console.log(`  docs/${name}`);
    }
  }
} catch (err) {
  if (err?.code === "EBUSY" || err?.code === "EPERM") {
    console.error(
      "\nDocument file is open in Word or the editor. Close it and run:\n  npm run docs:finalize"
    );
    process.exit(1);
  }
  throw err;
}

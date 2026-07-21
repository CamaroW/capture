import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";


const extensionRoot = new URL("../", import.meta.url);


function javascriptFiles(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true })
    .flatMap((entry) => {
      const entryUrl = new URL(entry.name, directoryUrl);
      if (entry.isDirectory()) {
        return javascriptFiles(new URL(`${entry.name}/`, directoryUrl));
      }
      return entry.isFile() && entry.name.endsWith(".js") ? [entryUrl] : [];
    });
}


test("every shipped extension JavaScript file parses", () => {
  const shippedRoots = [
    new URL("src/", extensionRoot),
    new URL("tests/fixtures/", extensionRoot),
  ];

  for (const fileUrl of shippedRoots.flatMap(javascriptFiles)) {
    const filePath = fileURLToPath(fileUrl);
    const result = spawnSync(process.execPath, ["--check", filePath], {
      encoding: "utf8",
    });
    assert.equal(
      result.status,
      0,
      `${filePath} did not parse:\n${result.stderr || result.stdout}`,
    );
  }
});

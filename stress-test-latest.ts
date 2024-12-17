#!/usr/bin/env node
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { readFileSync } from "fs";

import { execSync, exec } from "child_process";
import { getLinesAddedAndRemoved } from "./line-numbers";

const getGitBranchName = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec("git rev-parse --abbrev-ref HEAD", (error, stdout, stderr) => {
      if (error) {
        return reject(`exec error: ${error.message}`);
      }
      if (stderr) {
        return reject(`stderr: ${stderr}`);
      }
      resolve(stdout.trim());
    });
  });
};

const MyOctokit = Octokit.plugin(restEndpointMethods);
const github = new MyOctokit({ auth: process.env["GITHUB_TOKEN"] });

const config = {
  owner: "metabase",
  repo: "metabase",
};

let changedSpecs: string[] = [];
try {
  const filesChanged = execSync("git diff --name-only master").toString();
  const filesArray = filesChanged.split("\n");
  changedSpecs = filesArray.filter(filename => filename.includes("cy.spec"));
  console.log('Files containing "cy.spec" edited since master:', changedSpecs);
} catch (error) {
  console.error("Error while fetching files:", error);
}
changedSpecs.forEach(async filename => {
  console.log(
    `Creating stress test for ${filename} - press any key to continue...`,
  );
  await new Promise(resolve => process.stdin.once("data", resolve));

  // Find the start and end line numbers of each test
  const fileContent = readFileSync(filename, "utf8");
  const testMetadata: { start: number; end?: number }[] = [];

  const { linesAddedToNewFile = [], linesRemovedFromOldFile = [] } =
    (await getLinesAddedAndRemoved()) || {};
  console.log("@m4b5vv0g", "linesAddedToNewFile", linesAddedToNewFile);
  console.log("@m4b5vxbs", "linesRemovedFromOldFile", linesRemovedFromOldFile);
  process.exit(0);

  let leadingWhitespace: string | null = null;
  fileContent.split("\n").forEach((line, index) => {
    if (/\s+it\(/.test(line)) {
      testMetadata.push({ start: index });
      console.log(`Test starts at line ${index + 1}`);
      leadingWhitespace = line.match(/^\s+/)?.[0] ?? "";
    }
    // TODO: If there's a line with the same number of spaces as the `it(`
    // line, it's the end of the test
    if (leadingWhitespace !== null && line === `${leadingWhitespace}});`) {
      testMetadata[testMetadata.length - 1].end = index;
      console.log(`Test ends at line ${index + 1}`);
      leadingWhitespace = null;
    }
  });

  // github.rest.actions.createWorkflowDispatch({
  //   ...config,
  //   workflow_id: "e2e-stress-test-flake-fix.yml",
  //   ref: await getGitBranchName(),
  //   inputs: {
  //     spec: filename,
  //     burn_in: "20",
  //     grep: "should mute items in legend", // optional grep filter
  //   },
  // });
});

console.log(
  "Visit https://github.com/metabase/metabase/actions/workflows/e2e-stress-test-flake-fix.yml",
);

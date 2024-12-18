#!/usr/bin/env node
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";

import { exec } from "child_process";

const getGitBranchName = async () => {
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

const [_, __, spec, testNameRegex] = process.argv;

if (!spec) {
  console.error("Error: spec parameter is required");
  process.exit(1);
}

const getFlagValue = (flag) => {
  const args = process.argv.slice(2);
  const flagIndex = args.findIndex(
    (arg) => arg === `--${flag}` || arg.startsWith(`--${flag}=`),
  );
  if (flagIndex === -1) return null;

  const arg = args[flagIndex];
  if (arg.includes("=")) {
    return arg.split("=")[1];
  }
  return args[flagIndex + 1];
};

(async () => {
  const branch = getFlagValue("branch") || (await getGitBranchName());
  const burnCount = getFlagValue("burn") || "20";
  const params = {
    ...config,
    workflow_id: "e2e-stress-test-flake-fix.yml",
    ref: branch,
    inputs: {
      spec,
      burn_in: burnCount,
      grep: testNameRegex, // optional grep filter
    },
  };
  await github.rest.actions.createWorkflowDispatch(params);
  console.log("Workflow dispatched with params:", params);
  console.log();
  console.log(
    "Visit https://github.com/metabase/metabase/actions/workflows/e2e-stress-test-flake-fix.yml",
  );
})();

// TODO: combine with this fzf command. In place of enter:execute etc, pass the filename and test name to this script:
// find e2e -type f -name "*cy.spec*" | while read -r file; do                                                                              ─╯
//   grep -Hn "\<it(" "$file"
// done | fzf --height 40% --border --ansi --bind "enter:execute(echo {} > /dev/tty)"

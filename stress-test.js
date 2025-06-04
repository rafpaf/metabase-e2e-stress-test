#!/usr/bin/env node
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import dayjs from "dayjs";

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
  const response = await github.rest.actions.listWorkflowRunsForRepo(config);
  const jobIdsToWatch = [];
  let runId = null;
  for (const run of response.data.workflow_runs.filter(
    (run) => run.status === "in_progress",
  )) {
    // console.log(`In progress: run ${run.id} ${run.html_url}`);
    runId = run.id;
    const response = await github.rest.actions.listJobsForWorkflowRun({
      ...config,
      run_id: run.id,
    });
    const stressTestSteps = response.data.jobs.flatMap((job) => {
      const steps = job.steps.filter((step) =>
        step.name.startsWith("Stress-test"),
      );
      if (steps.length) {
        jobIdsToWatch.push(job.id);
      }
      return steps;
    });
    // useful: downloadJobLogsForWorkflowRun;
  }
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const messages = [];
    for (const jobId of jobIdsToWatch) {
      const response = await github.rest.actions.getJobForWorkflowRun({
        ...config,
        job_id: jobId,
      });
      const job = response.data;
      const steps = job.steps.filter((step) =>
        step.name.startsWith("Stress-test"),
      );
      steps.forEach((step) => {
        const startedAt = dayjs(step.started_at);
        const secondsElapsed = dayjs().diff(startedAt, "second");
        const duration = isNaN(secondsElapsed)
          ? ""
          : ` running for ${secondsElapsed}s`;
        messages.push(`${step.name}${duration}`);
        if (step.conclusion === "failure") {
          messages.push(`Failed: ${job.html_url}`);
        }
        if (step.conclusion === "success") {
          messages.push(`Success: ${job.html_url}`);
        }
      });
    }
    console.clear();
    console.log(messages.join("\n"));
  }

  // console.log("Workflow dispatched with params:", params);
  // console.log();
  // console.log(
  //   "Visit https://github.com/metabase/metabase/actions/workflows/e2e-stress-test-flake-fix.yml",
  // );
})();

// TODO: combine with this fzf command. In place of enter:execute etc, pass the filename and test name to this script:
// find e2e -type f -name "*cy.spec*" | while read -r file; do                                                                              ─╯
//   grep -Hn "\<it(" "$file"
// done | fzf --height 40% --border --ansi --bind "enter:execute(echo {} > /dev/tty)"

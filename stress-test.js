#!/usr/bin/env node
import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import dayjs from "dayjs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { exec, spawn } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

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

let [_, __, spec, testNameRegex] = process.argv;

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

// Get the current file's path
const __filename = fileURLToPath(import.meta.url);
// Get the directory of the current module
const __dirname = dirname(__filename);

(async () => {
  if (!spec || spec.startsWith("--")) {
    // const { stdout, stderr } = await execPromise(
    //   __dirname + "/../filter-tests.sh",
    // );

    const script = spawn(__dirname + "/../filter-tests.sh", [], {
      stdio: [process.stdin, "pipe", process.stderr], // Ensure interactive I/O handling
    });

    let scriptOutput = "";

    script.stdout.on("data", (data) => {
      scriptOutput += data;
    });

    script.on("error", (err) => {
      console.error("Failed to start script:", err);
    });

    script.on("close", (code) => {
      if (code === 0) {
        console.log(`Script completed successfully. Output:\n${scriptOutput}`);
      } else {
        console.error(`Script failed with code ${code}`);
      }
    });
    process.exit(1);

    const selected = stdout.trim();
    console.log("@mbj44xrk", "selected", selected);

    spec = selected.split(">")[0].trim();
    console.log("@mbj2s41s", "spec", spec);

    if (!spec) {
      console.error("No spec file selected");
      process.exit(1);
    }
    const testLine = selected.split(">")[1]?.trim() || "";
    console.log("@mbj3xbug", "testLine", testLine);

    // testNameRegex = testLine.match(/it\("([^"]*)/)[1];
  }
  console.log("@mbj3tii0", "spec", spec);

  console.log("@mbj3tdvc", "testNameRegex", testNameRegex);

  process.exit(1);

  const branch = getFlagValue("branch") || (await getGitBranchName());
  const burnCount = getFlagValue("burn") || "20";
  const mbEdition = getFlagValue("mb_edition") || "ee";
  const qaDB = getFlagValue("qa_db") || "none";
  const enableNetworkThrottlingString =
    getFlagValue("enable_network_throttling") || "true";

  // Validation
  if (!["ee", "oss"].includes(mbEdition)) {
    console.error('mb_edition must be "ee" or "oss"');
    process.exit(1);
  }
  if (!["none", "sql", "mongo"].includes(qaDB)) {
    console.error('qaDB must be "none", "sql", or "mongo"');
    process.exit(1);
  }
  if (!["true", "false"].includes(enableNetworkThrottlingString)) {
    console.error('enable_network_throttling must be "true" or "false"');
    process.exit(1);
  }
  const enableNetworkThrottling = enableNetworkThrottlingString === "true";

  const params = {
    ...config,
    workflow_id: "e2e-stress-test-flake-fix.yml",
    ref: branch,
    inputs: {
      spec,
      burn_in: burnCount,
      grep: testNameRegex,
      mb_edition: mbEdition,
      qa_db: qaDB,
      enable_network_throttling: enableNetworkThrottling,
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
  console.log("Watching stress test jobs for run:", runId);
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

import simpleGit from "simple-git";
const git = simpleGit();

export const getLinesAddedAndRemoved = async () => {
  try {
    const linesAddedToNewFile: number[] = [];
    const linesRemovedFromOldFile: number[] = [];
    // Retrieve the full diff
    const diffOutput = await git.diff(["master", "--unified=0"]);

    // Split into epochs by files
    const fileDiffs = diffOutput.split(/^diff --git/).slice(1);

    for (const fileDiff of fileDiffs) {
      // Match file paths
      const matchFile = fileDiff.match(/\n--- a\/(.+)\n\+\+\+ b\/(.+)/);
      if (!matchFile) continue;

      const fileName = matchFile[2];
      // console.log(`File: ${fileName}`);

      const lines = fileDiff.split("\n");
      let currentLineOld = 0;
      let currentLineNew = 0;

      for (const line of lines) {
        if (line.startsWith("@@")) {
          // Capture the hunk details
          const matchHunk = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
          if (matchHunk) {
            currentLineOld = parseInt(matchHunk[1], 10);
            currentLineNew = parseInt(matchHunk[2], 10);
          }
        } else if (line.startsWith("+") && !line.startsWith("+++")) {
          // Added line
          linesAddedToNewFile.push(currentLineNew);
          //console.log(`  Added at line ${currentLineNew}: ${line.slice(1)}`);
          currentLineNew++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          // Removed line
          linesRemovedFromOldFile.push(currentLineOld);
          //console.log(`  Removed at line ${currentLineOld}: ${line.slice(1)}`);
          currentLineOld++;
        } else {
          // Context line (unchanged)
          currentLineOld++;
          currentLineNew++;
        }
      }
    }
    return { linesAddedToNewFile, linesRemovedFromOldFile };
  } catch (error) {
    console.error("Error processing git diff:", error);
  }
};

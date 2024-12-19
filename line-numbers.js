"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinesAddedAndRemoved = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const git = (0, simple_git_1.default)();
const getLinesAddedAndRemoved = async () => {
    try {
        const linesAddedToNewFile = [];
        const linesRemovedFromOldFile = [];
        // Retrieve the full diff
        const diffOutput = await git.diff(["master"]);
        // Split into epochs by files
        const fileDiffs = diffOutput.split(/^diff --git/).slice(1);
        for (const fileDiff of fileDiffs) {
            // Match file paths
            const matchFile = fileDiff.match(/\n--- a\/(.+)\n\+\+\+ b\/(.+)/);
            if (!matchFile)
                continue;
            const fileName = matchFile[2];
            console.log(`File: ${fileName}`);
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
                }
                else if (line.startsWith("+") && !line.startsWith("+++")) {
                    // Added line
                    linesAddedToNewFile.push(currentLineNew);
                    //console.log(`  Added at line ${currentLineNew}: ${line.slice(1)}`);
                    currentLineNew++;
                }
                else if (line.startsWith("-") && !line.startsWith("---")) {
                    // Removed line
                    linesRemovedFromOldFile.push(currentLineOld);
                    //console.log(`  Removed at line ${currentLineOld}: ${line.slice(1)}`);
                    currentLineOld++;
                }
                else {
                    // Context line (unchanged)
                    currentLineOld++;
                    currentLineNew++;
                }
            }
        }
        return { linesAddedToNewFile, linesRemovedFromOldFile };
    }
    catch (error) {
        console.error("Error processing git diff:", error);
    }
};
exports.getLinesAddedAndRemoved = getLinesAddedAndRemoved;

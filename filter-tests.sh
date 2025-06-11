#!/usr/bin/env zsh
# Find all Cypress end-to-end (e2e) test files,
# extract the test names from them,
# and present them in a selectable format using fzf.

# Iterate over each spec file.
# find e2e -type f -name "*cy.spec*" | while read -r file; do
#   # Output 'run all tests' for the current file at the top.
#   echo "$file: All tests"
#   # Find each `it` test and format it, removing `it(` and `)`.
#   grep -Hn "\\<it(" "$file" | \
#     sed "s/\\(.*\\):.*it([\"\`']\\([^\"\`']*\\)[\"\`'].*/\\1 > \\2/g"
# done | \

get_script_dir()
{
    local SOURCE_PATH="${BASH_SOURCE[0]}"
    local SYMLINK_DIR
    local SCRIPT_DIR
    # Resolve symlinks recursively
    while [ -L "$SOURCE_PATH" ]; do
        # Get symlink directory
        SYMLINK_DIR="$( cd -P "$( dirname "$SOURCE_PATH" )" >/dev/null 2>&1 && pwd )"
        # Resolve symlink target (relative or absolute)
        SOURCE_PATH="$(readlink "$SOURCE_PATH")"
        # Check if candidate path is relative or absolute
        if [[ $SOURCE_PATH != /* ]]; then
            # Candidate path is relative, resolve to full path
            SOURCE_PATH=$SYMLINK_DIR/$SOURCE_PATH
        fi
    done
    # Get final script directory path from fully resolved source path
    SCRIPT_DIR="$(cd -P "$( dirname "$SOURCE_PATH" )" >/dev/null 2>&1 && pwd)"
    echo "$SCRIPT_DIR"
}

SCRIPT_DIR=$(get_script_dir)
node "$SCRIPT_DIR/dist/filter-tests.js" #| fzf --height 40% --border --ansi --prompt="Select an e2e test: "

#!/usr/bin/env zsh
# Iterate over each spec file.
find e2e -type f -name "*cy.spec*" | while read -r file; do
  # Output 'run all tests' for the current file at the top.
  echo "$file: All tests"
  # Find each `it` test and format it, removing `it(` and `)`.
  grep -Hn "\\<it(" "$file" | \
    sed "s/\\(.*\\):.*it([\"\`']\\([^\"\`']*\\)[\"\`'].*/\\1 > \\2/g"

done | \
fzf --height 40% --border --ansi --prompt="Select an e2e test: "

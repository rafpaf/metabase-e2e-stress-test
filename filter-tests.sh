#!/usr/bin/env zsh
find e2e -type f -name "*cy.spec*" | while read -r file; do grep -Hn "\\<it(" "$file"; done | awk '{print $0 "\n"}' | grep -v "^$" | sed "s/:.*://" | sed "s/\s\+/ /" | sed "s/it([\"\`\']/ > /" | sed "s/[\"\`\'][^\"\`\']\+$//" | /opt/homebrew/bin/gum filter --no-limit

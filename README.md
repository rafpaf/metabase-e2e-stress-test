This is a script to be used at Metabase for stress-testing e2e tests in CI.

To run:

```bash
stress-test.js $fileName $optionalTestRegex --branch=$optionalBranchName
```

For example:

```bash
stress-test.js e2e/test/scenarios/permissions/view-data.cy.spec.js "should allow saving 'blocked' and disable create queries dropdown when set"
```

By default it will use the currently checked-out Git branch, but you can also specify a branch by appending `--branch $branchName`.

It will run matching tests 20 times by default. You can also add the flag `--burn $integer` to run the tests that many times.

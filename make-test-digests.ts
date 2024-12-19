#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as glob from "glob";
import * as babelParser from "@babel/parser";
import * as t from "@babel/types";

import _generator from "@babel/generator";
import _traverse from "@babel/traverse";

const traverse = (_traverse as any).default as any;
const generate = (_generator as any).default as any;

function getTestFiles(testDir: string) {
  return glob.sync(`${testDir}/**/*.cy.spec.js`);
}
type Test = {
  name: string;
  body: string;
};

function parseTestFile(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const ast = babelParser.parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  let tests: Test[] = [];

  // Stack of describe() blocks
  const describes: string[] = [];

  traverse(ast, {
    enter(path: any) {
      if (path.node.type === "CallExpression" && path.node.callee) {
        const calleeName = (path.node.callee as any).name;

        if (calleeName === "describe") {
          const args = path.node.arguments as any;
          const describeName = args[0].value;
          describes.push(describeName);
        }
        if (calleeName === "it") {
          const args = path.node.arguments as any;
          const testName = args[0].value;
          const otherArgs = args.slice(1);
          const codeForEachArg = otherArgs.map((arg: any) => {
            if (arg.body) {
              return generate(arg.body).code;
            } else {
              if (t.isTemplateLiteral(arg)) {
                return generate(t.templateLiteral(arg.quasis, arg.expressions))
                  .code;
              }
              return generate(arg);
            }
          });
          const body = JSON.stringify(codeForEachArg);
          tests.push({
            name: [...describes, testName].join(" > "),
            body,
          });
        }
      }
    },
    exit(path: any) {
      const calleeName = (path?.node?.callee as any)?.name;
      if (calleeName === "describe") {
        describes.pop();
      }
    },
  });

  return tests;
}

function generateHash(content: string) {
  return crypto
    .createHash("sha256")
    .update(content || "")
    .digest("hex");
}

function createTestMappings(testDir: string) {
  let testMappings: Record<string, string> = {};
  const testFiles = getTestFiles(testDir);
  console.log("@m4v1dyog", "testFiles", testFiles);

  for (const file of testFiles) {
    const tests = parseTestFile(file);
    tests.forEach((test) => {
      const hash = generateHash(test.body);
      testMappings[test.name] = hash;
    });
  }

  return testMappings;
}

// function compareMappings(oldMappings, newMappings) {
//   let newOrModifiedTests = [];

//   for (const testName in newMappings) {
//     if (
//       !oldMappings[testName] ||
//       oldMappings[testName] !== newMappings[testName]
//     ) {
//       newOrModifiedTests.push(testName);
//     }
//   }

//   return newOrModifiedTests;
// }

// Example usage:
// const newBranchTestDir = './tests'; // Directory for the new branch tests
// const oldBranchTestDir = './tests_old'; // Directory for the tests in the old branch

const mappings = createTestMappings("e2e");
console.log(mappings);

// const newMappings = createTestMappings(newBranchTestDir);
// const newOrModifiedTests = compareMappings(oldMappings, newMappings);

// console.log('New or Modified Tests:', newOrModifiedTests);
// vim: set ft=typescript:

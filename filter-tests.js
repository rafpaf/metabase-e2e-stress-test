import fs from "fs";
import path from "path";
import recast from "recast";
import babelParser from "@babel/parser";
import { execSync } from "child_process";

// Define parser options to handle modern JavaScript features
const parserOptions = {
  sourceType: "module",
  plugins: [
    "jsx",
    "tsx",
    "typescript",
    "asyncGenerators",
    "bigInt",
    "classPrivateMethods",
    "classPrivateProperties",
    "classProperties",
    "dynamicImport",
    "exportDefaultFrom",
    "exportNamespaceFrom",
    "importMeta",
    "logicalAssignment",
    "nullishCoalescingOperator",
    "numericSeparator",
    "objectRestSpread",
    "optionalCatchBinding",
    "optionalChaining",
    "topLevelAwait",
  ],
};

// Custom parser using Babel with the specified options
const customParser = {
  parse(code) {
    return babelParser.parse(code, parserOptions);
  },
};

// Function to extract tests
function extractTests(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const ast = recast.parse(source, { parser: customParser });

  const tests = [];

  recast.visit(ast, {
    visitCallExpression(path) {
      const { callee, arguments: args } = path.node;
      // Check for 'it' or 'test' functions
      if (
        callee.type === "Identifier" &&
        (callee.name === "it" || callee.name === "test") &&
        args.length > 0
      ) {
        const firstArg = args[0];
        let value;
        if (firstArg.type === "StringLiteral") {
          value = firstArg.value;
        } else if (firstArg.type === "TemplateLiteral") {
          // For simplicity, extract raw content without expressions
          value = firstArg.quasis.map((quasi) => quasi.value.raw).join(".*");
          console.log("QUASIVALUE", value);
        }
        tests.push(value);
      }
      this.traverse(path);
    },
  });

  return tests;
}

// Walk directories, find all files with given names
execSync('find e2e -type f -name "*cy.spec*"')
  .toString()
  .trim()
  .split("\n")
  .forEach((file) => {
    console.log(`${file}: All tests`);
    try {
      const tests = extractTests(file);
      tests.forEach((testName) => {
        console.log(`${file} > ${testName}`);
      });
    } catch (e) {
      console.error(`Error while extracting tests from ${file}`);
    }
  });

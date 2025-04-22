// .eslintrc.cjs
module.exports = {
    // Files and folders to skip
    ignorePatterns: [
      "node_modules/",
      "logs/",
      "scripts/",
      ".github/"
    ],
    env: {
      node: true,        // enable Node.js globals (require, module, process, __dirname…)
      commonjs: true,    // CommonJS (require/module)
      es2021: true,      // modern ECMAScript features
      jest: true         // Jest globals (describe, it, expect…)
    },
    globals: {
      require: "readonly",
      module: "readonly",
      process: "readonly",
      __dirname: "readonly"
    },
    extends: "eslint:recommended",
    parserOptions: {
      ecmaVersion: 12,
      sourceType: "script"
    },
    rules: {
      // e.g., "no-console": "warn"
    }
  };
  
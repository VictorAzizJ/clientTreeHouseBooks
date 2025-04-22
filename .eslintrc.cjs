// .eslintrc.cjs
module.exports = {
    env: {
      node:    true,   // gives you require, module, process, __dirname
      commonjs:true,
      es2021:  true,
      jest:    true    // gives you describe, it, expect
    },
    ignorePatterns: [
      "node_modules/",
      "logs/",
      "scripts/",
      ".github/"
    ],
    globals: {
      require:   "readonly",
      module:    "readonly",
      process:   "readonly",
      __dirname: "readonly"
    },
    extends: "eslint:recommended",
    parserOptions: {
      ecmaVersion: 12,
      sourceType: "script"
    }
  };
  
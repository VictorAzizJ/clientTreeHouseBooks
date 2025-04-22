// .eslintrc.cjs
module.exports = {
    ignorePatterns: [
      "node_modules/",
      "logs/",
      "scripts/",
      ".github/",
      ".eslintrc.cjs"
    ],
    env: {
      node: true,
      commonjs: true,
      es2021: true,
      jest: true
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
    }
  };
  
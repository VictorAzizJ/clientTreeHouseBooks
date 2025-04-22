// eslint.config.cjs
const { FlatCompat } = require("@eslint/eslintrc");

// This helper lets us “extend” eslint:recommended under flat config
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedDefault: true
});

module.exports = [
  // 1) import all the rules from eslint:recommended
  ...compat.config({ extends: ["eslint:recommended"] }),

  // 2) our own config
  {
    // files/folders to ignore
    ignores: [
      "node_modules/**",
      "logs/**",
      "scripts/**",
      ".github/**"
    ],

    // enable Node/CommonJS and Jest globals
    languageOptions: {
      env: {
        node:     true,  // require, module, process, __dirname
        commonjs: true,
        es2021:   true,
        jest:     true   // describe, it, expect
      }
    },

    // any additional rule overrides go here
    rules: {
      // e.g. "no-console": "warn"
    }
  }
];

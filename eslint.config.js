// eslint.config.js
export default [
    // 1. Globals & parser options
    {
      languageOptions: {
        env: {
          node: true,        // allow require, module, process, __dirname
          commonjs: true,
          es2021: true,
          jest: true         // allow describe, it, expect
        }
      }
    },
    // 2. Ignore folders you don’t want linted
    {
      ignores: [
        "node_modules/**",
        "logs/**",
        "scripts/**",
        ".github/**"
      ]
    },
    // 3. Extend recommended rules
    {
      ...require("eslint/conf/eslint-recommended"),  // use eslint:recommended
      rules: {
        // your overrides, e.g.:
        // "no-console": "warn"
      }
    }
  ];
  
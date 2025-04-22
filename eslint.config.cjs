// eslint.config.cjs

module.exports = [
    // 1. Which files/folders to ignore
    {
      ignores: [
        "node_modules/**",
        "logs/**",
        "scripts/**",
        ".github/**"
      ]
    },
    // 2. Language options (globals & parser settings)
    {
      languageOptions: {
        env: {
          node:     true,  // require, module, process, __dirname
          commonjs: true,
          es2021:   true,
          jest:     true   // describe, it, expect
        }
      }
    },
    // 3. Extend the recommended ruleset
    {
      rules: {},
      extends: ["eslint:recommended"]
    }
  ];
  
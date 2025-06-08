module.exports = {
       root: true,
       parser: "@typescript-eslint/parser",
       plugins: ["@typescript-eslint", "react", "react-hooks", "jsx-a11y", "import"],
       extends: [
              "eslint:recommended",
              "plugin:@typescript-eslint/recommended",
              "plugin:react/recommended",
              "plugin:react-hooks/recommended",
              "plugin:jsx-a11y/recommended",
              "plugin:import/recommended",
              "plugin:import/typescript",
              "plugin:astro/recommended",
              "prettier"
       ],
       settings: {
              react: { version: "detect" },
              "import/resolver": {
                     typescript: { project: "./tsconfig.json" },
                     node: {
                            extensions: [".js", ".jsx", ".ts", ".tsx", ".astro", ".css"]
                     }
              }
       },
       overrides: [
              {
                     files: ["*.astro"],
                     parser: "astro-eslint-parser",
                     parserOptions: {
                            parser: "@typescript-eslint/parser",
                            extraFileExtensions: [".astro"],
                            project: "./tsconfig.json"
                     },
                     extends: ["plugin:astro/recommended"],
                     rules: {
                            // Disable React rules in Astro files
                            "react/react-in-jsx-scope": "off",
                            "react/no-unknown-property": "off",
                            "react/jsx-uses-react": "off",
                            "react/jsx-uses-vars": "off",
                            "react/jsx-key": "off",
                            "react/jsx-no-undef": "off"
                     }
              },
              {
                     files: ["*.ts", "*.tsx"],
                     rules: {
                            "react/react-in-jsx-scope": "off",
                            "react/prop-types": "off"
                     }
              }
       ],
       rules: {
              "no-console": "warn",
              "no-debugger": "warn",
              "no-unused-vars": "off",
              "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
              "react/jsx-uses-react": "off",
              "react/jsx-uses-vars": "error",
              "import/order": [
                     "warn",
                     {
                            groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
                            "newlines-between": "always"
                     }
              ]
       },
       env: {
              browser: true,
              node: true,
              es2022: true
       }
};
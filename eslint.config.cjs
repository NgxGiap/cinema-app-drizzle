
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const prettier = require("eslint-plugin-prettier");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  // Ignore build & dependencies
  {
    ignores: ["dist", "node_modules"],
  },

  // Apply cho toàn bộ code TypeScript
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: [
          "./frontend/tsconfig.eslint.json",
          "./tsconfig.eslint.json",
        ],
        tsconfigRootDir: __dirname
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
      import: importPlugin,
    },
    rules: {
      // 🔹 Rules TypeScript mặc định
      ...tseslint.configs.recommended.rules,

      // 🔹 Prettier (formatting errors)
      "prettier/prettier": "off",

      // 🔹 Import order
      "import/order": [
        "off",
        {
          groups: [
            "builtin", // Node builtins
            "external", // Thư viện ngoài
            "internal", // Nội bộ project
            ["parent", "sibling", "index"],
          ],
          pathGroups: [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      // 🔹 Một số rule hay dùng
      "no-console": "off",
      "any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

import tseslint from "typescript-eslint";

export default tseslint.config({ ignores: ["dist/"] }, ...tseslint.configs.recommendedTypeChecked, {
    languageOptions: {
        parserOptions: {
            project: "./tsconfig.json",
        },
    },
});

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // O app mobile (mobile/) tem o próprio ESLint.
  { ignores: ["mobile/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

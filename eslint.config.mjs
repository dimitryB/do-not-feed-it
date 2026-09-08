import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTs, globalIgnores([".next/**", "dist/**", "build/**", "node_modules/**", "artifacts/**", "cache/**", "next-env.d.ts"])]);

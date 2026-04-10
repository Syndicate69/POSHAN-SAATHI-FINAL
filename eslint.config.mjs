import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Remove the broken rule from all inherited configs
const cleanNext = next.map(config => {
  if (config.rules?.["react-hooks/set-state-in-effect"]) {
    const { "react-hooks/set-state-in-effect": _, ...rules } = config.rules;
    return { ...config, rules };
  }
  return config;
});

export default defineConfig([{
  extends: [...cleanNext],
}]);

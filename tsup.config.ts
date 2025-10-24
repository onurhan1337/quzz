import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/visualizer/trace-collector.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ["react", "next", "react-dom"],
  treeshake: true,
});

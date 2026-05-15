import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "que-fer", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets work at both / and /repository-name/ on static hosts.
  base: './',
  build: {
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        wotr: fileURLToPath(new URL('./WotR/index.html', import.meta.url)),
      },
    },
  },
});

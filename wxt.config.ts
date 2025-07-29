import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
  },
  webExt: {
    startUrls: ["https://en.wikipedia.org/wiki/Two-phase_commit_protocol"],
  },
});

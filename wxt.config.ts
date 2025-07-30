import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Salty Sidebar',
    permissions: ['storage'],
    web_accessible_resources: [
      {
        resources: ["icon/*.png"],
        matches: ["<all_urls>"]
      }
    ]
  },
  webExt: {
    startUrls: ["https://en.wikipedia.org/wiki/Two-phase_commit_protocol"],
  },
});

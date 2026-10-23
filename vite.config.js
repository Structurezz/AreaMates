import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Replaces <!--GOOGLE_TAGS_HERE--> in index.html with the Search Console
// verification tag (VITE_GOOGLE_SITE_VERIFICATION) and the GA4 snippet
// (VITE_GA_MEASUREMENT_ID). Either can be unset — nothing is emitted for it.
// Page views are sent per route by src/components/SeoTracker.jsx, so the
// automatic one is disabled here to avoid double counting.
function injectGoogleTags(env) {
  return {
    name: 'inject-google-tags',
    transformIndexHtml(html) {
      const parts = [];
      const verify = (env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();
      const gaId   = (env.VITE_GA_MEASUREMENT_ID || '').trim();
      if (verify) parts.push(`<meta name="google-site-verification" content="${verify}" />`);
      if (gaId) {
        parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: false });
    </script>`);
      }
      return html.replace('<!--GOOGLE_TAGS_HERE-->', parts.join('\n    ') || '<!-- google tags: none configured -->');
    },
  };
}


// New-deploy detection (src/components/ui/UpdateBanner.jsx): every build gets
// a version baked into the bundle and written to dist/version.json, which the
// running app polls. A different value means a new deploy is live.
const BUILD_VERSION = String(Date.now());
function emitVersionFile() {
  return {
    name: 'emit-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() }) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  define: { __APP_VERSION__: JSON.stringify(BUILD_VERSION) },
  plugins: [react(), injectGoogleTags(loadEnv(mode, process.cwd(), '')), emitVersionFile()],
  server: { proxy: { '/api': { target: 'http://localhost:5008', changeOrigin: true }, '/uploads': { target: 'http://localhost:5008', changeOrigin: true } } },
}));

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Search + analytics wiring for this SPA. Mounted once inside <BrowserRouter>.
//
// - Public pages (login / register) get their own title, description and
//   canonical URL and are indexable, so the app shows up when people search
//   for it by name.
// - Every other route is behind auth and may contain residents' data, so it is
//   marked noindex.
// - Sends a GA4 page_view on each route change (gtag is injected at build time
//   by vite.config.js when VITE_GA_MEASUREMENT_ID is set). IDs and tokens in
//   the path are masked so no personal data reaches Google Analytics.

const SITE_URL  = 'https://area-mates.areaconnect.pro';
const APP_TITLE = 'AreaMates — Resident App by AreaConnect';

const PUBLIC_PAGES = {
  '/login': [
    "AreaMates Login — Resident App for Nigerian Estates",
    "Sign in to AreaMates to pre-register visitors, pay service charges, chat with neighbours and get estate announcements and security alerts in real time.",
  ],
  '/register': [
    "Join Your Estate on AreaMates | AreaConnect",
    "Create your AreaMates resident account with your estate code. Generate visitor QR passes, pay levies online and stay connected with your community.",
  ],
};

const DEFAULT_DESCRIPTION = "Sign in to AreaMates to pre-register visitors, pay service charges, chat with neighbours and get estate announcements and security alerts in real time.";

function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

// "/visitors/66f1c2…" → "/visitors/:id". Masks Mongo IDs, tokens and codes.
function maskPath(pathname) {
  return pathname
    .split('/')
    .map(seg => (seg.length >= 16 || /\d/.test(seg) ? ':id' : seg))
    .join('/');
}

export default function SeoTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = PUBLIC_PAGES[pathname];
    const title = page ? page[0] : APP_TITLE;

    document.title = title;
    setMeta('meta[name="robots"]', {
      name: 'robots',
      content: page ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    });
    setMeta('meta[name="description"]', { name: 'description', content: page ? page[1] : DEFAULT_DESCRIPTION });
    if (page) {
      setMeta('link[rel="canonical"]', { rel: 'canonical', href: `${SITE_URL}${pathname}` });
    } else {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    }

    if (typeof window.gtag === 'function') {
      const path = maskPath(pathname);
      window.gtag('event', 'page_view', {
        page_path: path,
        page_location: `${SITE_URL}${path}`,
        page_title: title,
      });
    }
  }, [pathname]);

  return null;
}

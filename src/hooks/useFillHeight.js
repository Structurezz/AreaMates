import { useLayoutEffect, useState } from 'react';

// Height from an element's top to the bottom of the viewport (minus <main>'s bottom
// padding), so a desktop page can fill one screen and scroll only its inner panels.
export default function useFillHeight(ref, enabled, { bottomGap = 32, min = 420 } = {}) {
  const [h, setH] = useState(null);
  useLayoutEffect(() => {
    if (!enabled || !ref.current) { setH(null); return; }
    document.querySelector('main')?.scrollTo(0, 0); // measure from the top of the page
    const measure = () => setH(Math.max(min, window.innerHeight - ref.current.getBoundingClientRect().top - bottomGap));
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (ref.current.parentElement) ro.observe(ref.current.parentElement);
    return () => { window.removeEventListener('resize', measure); ro.disconnect(); };
  }, [enabled, bottomGap, min]);
  return h;
}

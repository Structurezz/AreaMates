import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// When the URL carries ?focus=<id>, wait for the element marked
// data-focus-id="<id>" to render, scroll it into view and flash it.
// Mounted once in the app layout, so any page only needs the data attribute.
export default function useFocusItem() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('focus');
    if (!id) return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      const el = document.querySelector(`[data-focus-id="${CSS.escape(id)}"]`);
      if (el || ++tries > 40) {
        clearInterval(timer);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('focus-flash');
          void el.offsetWidth; // restart the animation
          el.classList.add('focus-flash');
          setTimeout(() => el.classList.remove('focus-flash'), 2600);
        }
        params.delete('focus');
        const rest = params.toString();
        navigate(location.pathname + (rest ? `?${rest}` : ''), { replace: true });
      }
    }, 200);
    return () => clearInterval(timer);
  }, [location.search, location.pathname, navigate]);
}

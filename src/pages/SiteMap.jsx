import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { Search, X, Navigation, MapPin, Star, RefreshCw, MapPinOff } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import useSitePlaces from '../hooks/useSitePlaces';
import useIsDesktop from '../hooks/useIsDesktop';
import { GOOGLE_MAPS_LOADER, hasMapsKey, directionsFor } from '../utils/googleMaps';
import { kindMeta } from '../components/map/placeKinds';

// Site map: real Google map with a pin per hall / building / gate, and a
// searchable list. Phones: map on top with a draggable bottom sheet.
// Desktop: list on the left, map on the right.

const MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 }; // Lagos, when the site has no location yet
const hasPos = (p) => p && typeof p.lat === 'number' && typeof p.lng === 'number';

function Pin({ place, type, selected, mine, onClick }) {
  const { color, Icon } = kindMeta(place.kind, type);
  const size = selected || mine ? 38 : 30;
  return (
    <OverlayView position={{ lat: place.lat, lng: place.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}>
      <button type="button" onClick={onClick} className="flex flex-col items-center" style={{ zIndex: selected ? 3 : mine ? 2 : 1, position: 'relative' }}
        aria-label={place.name}>
        {(selected || mine) && (
          <span className="mb-1 px-2 py-1 rounded-lg bg-white text-[11px] font-bold text-slate-900 whitespace-nowrap shadow-md border"
            style={{ borderColor: `${color}55` }}>
            {mine && <Star size={10} className="inline -mt-0.5 mr-1 text-amber-500" fill="#F59E0B" />}{place.name}
          </span>
        )}
        <span className="rounded-full flex items-center justify-center border-[3px] border-white transition-transform"
          style={{ width: size, height: size, background: color, boxShadow: `0 6px 14px -4px ${color}`, transform: selected ? 'scale(1.08)' : undefined }}>
          <Icon size={selected || mine ? 17 : 14} className="text-white" />
        </span>
        <span className="w-0 h-0 -mt-[2px]" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${color}` }} />
      </button>
    </OverlayView>
  );
}

function PlaceRow({ place, type, selected, mine, onSelect }) {
  const { color, Icon, label } = kindMeta(place.kind, type);
  const url = directionsFor(place);
  return (
    <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors border ${selected ? 'bg-indigo-50/70 border-indigo-200' : mine ? 'bg-amber-50/60 border-amber-200' : 'border-transparent hover:bg-slate-50'}`}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A` }}>
        <Icon size={18} style={{ color }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[14px] font-semibold text-slate-900 truncate">{place.name}</span>
          {mine && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-px rounded-full bg-amber-100 text-amber-700 flex-shrink-0"><Star size={9} fill="currentColor" /> Yours</span>}
        </span>
        <span className="block text-[12px] text-slate-500 truncate">
          <span style={{ color }} className="font-medium">{label}</span>
          {place.description ? ` · ${place.description}` : place.address ? ` · ${place.address}` : ''}
        </span>
      </span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-xl text-white flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          <Navigation size={12} /> Directions
        </a>
      )}
    </div>
  );
}

// Snap points for the phone bottom sheet (fraction of the container height visible)
const SNAPS = [0.28, 0.55, 0.88];

function BottomSheet({ children, header }) {
  const ref = useRef(null);
  const [snap, setSnap] = useState(1);
  const [dragH, setDragH] = useState(null); // live height while dragging
  const dragRef = useRef(null); // { startY, startH, h, moved }
  const parentH = () => ref.current?.parentElement?.clientHeight || window.innerHeight;
  const height = dragH ?? SNAPS[snap] * parentH();

  const onDown = (e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const h = SNAPS[snap] * parentH();
    dragRef.current = { startY: y, startH: h, h, moved: false };
    setDragH(h);
  };
  const dragging = dragH !== null;
  useEffect(() => {
    if (!dragging) return undefined;
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const H = parentH();
      if (Math.abs(y - d.startY) > 5) d.moved = true;
      d.h = Math.max(H * 0.15, Math.min(H * 0.92, d.startH + (d.startY - y)));
      setDragH(d.h);
    };
    const up = () => {
      const d = dragRef.current;
      if (d?.moved) {
        const frac = d.h / parentH();
        let best = 0;
        SNAPS.forEach((sn, i) => { if (Math.abs(sn - frac) < Math.abs(SNAPS[best] - frac)) best = i; });
        setSnap(best);
      }
      setDragH(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  // A tap on the handle (no drag) steps through the snap points
  const onTap = () => { if (!dragRef.current?.moved) setSnap((sn) => (sn + 1) % SNAPS.length); dragRef.current = null; };

  return (
    <div ref={ref} className="absolute inset-x-0 bottom-0 z-10 bg-white rounded-t-[26px] flex flex-col"
      style={{ height, transition: dragging ? 'none' : 'height 220ms cubic-bezier(.2,.8,.2,1)', boxShadow: '0 -12px 32px -8px rgba(15,23,42,0.22)' }}>
      <div onMouseDown={onDown} onTouchStart={onDown} onClick={onTap}
        className="pt-2.5 pb-2 cursor-grab active:cursor-grabbing touch-none select-none flex-shrink-0">
        <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-300" />
      </div>
      <div className="px-4 flex-shrink-0">{header}</div>
      <div className="flex-1 overflow-y-auto px-2 pb-4 overscroll-contain">{children}</div>
    </div>
  );
}

export default function SiteMap() {
  const site = useSite();
  const { places, center, myPlace, loading, error, reload, site: placesSite } = useSitePlaces();
  const isDesktop = useIsDesktop();
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);

  const title = `${site.terms.site} map`;
  const siteName = placesSite?.name || site.name;
  const myId = myPlace?._id ? String(myPlace._id) : null;

  // Your own hall / building first, then by name
  const sorted = useMemo(() => {
    const list = [...places];
    if (myPlace && hasPos(myPlace) && !list.some((p) => String(p._id) === myId)) list.push(myPlace);
    return list.sort((a, b) => (String(b._id) === myId) - (String(a._id) === myId) || a.name.localeCompare(b.name));
  }, [places, myPlace, myId]);

  const kindsPresent = useMemo(() => [...new Set(sorted.map((p) => p.kind || 'other'))], [sorted]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sorted.filter((p) => (!kind || (p.kind || 'other') === kind)
      && (!term || `${p.name} ${p.block || ''} ${p.description || ''} ${p.address || ''} ${kindMeta(p.kind, site.type).label}`.toLowerCase().includes(term)));
  }, [sorted, q, kind, site.type]);

  const withPos = filtered.filter(hasPos);
  const startCenter = useMemo(() => (hasPos(myPlace) ? { lat: myPlace.lat, lng: myPlace.lng }
    : hasPos(center) ? center : hasPos(sorted[0]) ? { lat: sorted[0].lat, lng: sorted[0].lng } : DEFAULT_CENTER),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [loading]);

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    const pts = withPos;
    if (!map || !window.google) return;
    if (pts.length > 1) {
      const b = new window.google.maps.LatLngBounds();
      pts.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(b, isDesktop ? 60 : { top: 40, left: 30, right: 30, bottom: window.innerHeight * 0.5 });
    } else if (pts.length === 1) {
      map.panTo({ lat: pts[0].lat, lng: pts[0].lng }); map.setZoom(17);
    }
  }, [withPos, isDesktop]);

  const onLoad = useCallback((map) => { mapRef.current = map; }, []);
  useEffect(() => { if (isLoaded && !loading) fitAll(); }, [isLoaded, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (p) => {
    setSelectedId(String(p._id));
    if (mapRef.current && hasPos(p)) {
      mapRef.current.panTo({ lat: p.lat, lng: p.lng });
      if ((mapRef.current.getZoom() || 0) < 17) mapRef.current.setZoom(17);
      // keep the pin above the phone sheet
      if (!isDesktop) mapRef.current.panBy(0, window.innerHeight * 0.18);
    }
  };

  const canMap = hasMapsKey() && !loadError;

  const map = !canMap ? (
    <div className="w-full h-full flex flex-col items-center justify-center text-center bg-slate-100 px-6">
      <MapPinOff size={28} className="text-slate-400" />
      <p className="text-[13px] text-slate-500 mt-2">The map can't load right now. Use the Directions buttons to open places in Google Maps.</p>
    </div>
  ) : !isLoaded ? (
    <div className="w-full h-full skeleton" />
  ) : (
    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={startCenter} zoom={16} onLoad={onLoad}
      onClick={() => setSelectedId(null)}
      options={{ styles: MAP_STYLE, disableDefaultUI: true, zoomControl: isDesktop, clickableIcons: false, gestureHandling: 'greedy', fullscreenControl: false }}>
      {withPos.map((p) => (
        <Pin key={p._id} place={p} type={site.type} selected={selectedId === String(p._id)} mine={String(p._id) === myId} onClick={() => select(p)} />
      ))}
    </GoogleMap>
  );

  const header = (
    <div className="space-y-2.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-slate-900 leading-tight truncate" style={{ letterSpacing: '-0.025em' }}>{title}</h1>
          <p className="text-[12px] text-slate-500 truncate">{siteName}{sorted.length ? ` · ${sorted.length} place${sorted.length === 1 ? '' : 's'}` : ''}</p>
        </div>
        {canMap && isLoaded && withPos.length > 1 && (
          <button onClick={fitAll} className="text-[12px] font-semibold text-indigo-600 flex-shrink-0">Show all</button>
        )}
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search halls, buildings, gates…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2.5 text-[14px] outline-none focus:bg-white focus:border-indigo-300" />
        {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={15} /></button>}
      </div>
      {kindsPresent.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button onClick={() => setKind('')} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border ${!kind ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>All</button>
          {kindsPresent.map((k) => {
            const m = kindMeta(k, site.type);
            const on = kind === k;
            return (
              <button key={k} onClick={() => setKind(on ? '' : k)}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold border"
                style={on ? { background: m.color, borderColor: m.color, color: '#fff' } : { background: '#fff', borderColor: '#E2E8F0', color: '#475569' }}>
                <m.Icon size={12} style={{ color: on ? '#fff' : m.color }} /> {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const list = loading ? (
    <div className="space-y-2 p-2">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-14 rounded-2xl" />)}</div>
  ) : filtered.length === 0 ? (
    <div className="py-10 text-center px-6">
      <MapPin size={24} className="mx-auto text-slate-300" />
      <p className="text-[13px] text-slate-500 mt-2">
        {error ? "Couldn't load the places." : sorted.length ? 'No places match your search.' : `The ${site.terms.manager.toLowerCase()} hasn't added places to the map yet.`}
      </p>
      {error && <button onClick={reload} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-600"><RefreshCw size={13} /> Try again</button>}
    </div>
  ) : (
    <div className="space-y-1 pt-1">
      {filtered.map((p) => (
        <PlaceRow key={p._id} place={p} type={site.type} selected={selectedId === String(p._id)} mine={String(p._id) === myId} onSelect={() => select(p)} />
      ))}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="max-w-[1500px] mx-auto grid grid-cols-[380px_1fr] gap-5" style={{ height: 'calc(100dvh - 4rem)' }}>
        <div className="rounded-2xl bg-white border border-slate-200/70 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">{header}</div>
          <div className="flex-1 overflow-y-auto p-2">{list}</div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-slate-200/70 bg-slate-100">{map}</div>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 -mb-24 relative overflow-hidden"
      style={{ height: 'calc(100dvh - 3.5rem - 3.9rem - env(safe-area-inset-bottom))' }}>
      <div className="absolute inset-0">{map}</div>
      <BottomSheet header={header}>{list}</BottomSheet>
    </div>
  );
}

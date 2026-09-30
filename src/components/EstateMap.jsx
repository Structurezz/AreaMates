import { useMemo, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { MapPin, Navigation, Layers, ExternalLink } from 'lucide-react';

const GOOGLE_MAPS_LIBRARIES = ['places'];
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Indigo-accented map style to match AreaMates
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e0e7ff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c7d2fe' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e0f2fe' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0369a1' }] },
];

const INDIGO = '#6366F1';
const INDIGO_DARK = '#4F46E5';

function CustomMarker({ position, label }) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
        {label && (
          <div style={{
            background: '#fff', padding: '6px 10px', borderRadius: 10, marginBottom: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.15)', border: '1px solid rgba(99,102,241,0.20)',
            fontSize: 11, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap',
          }}>
            {label}
          </div>
        )}
        <div style={{ position: 'relative', width: 44, height: 44 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: INDIGO, opacity: 0.25, animation: 'estateMapPulse 2s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', top: 6, left: 6, width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(99,102,241,0.45)', border: '3px solid #fff',
          }}>
            <MapPin size={16} color="#fff" strokeWidth={2.5} />
          </div>
        </div>
        <style>{`
          @keyframes estateMapPulse {
            0%   { transform: scale(0.4); opacity: 0.6; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
      </div>
    </OverlayView>
  );
}

/**
 * EstateMap — glass-styled Google Maps card, indigo pin.
 * Props: location {lat,lng,formattedAddress?,placeId?}, address, name, height, variant 'card'|'plain'.
 */
export default function EstateMap({
  location, address, name, height = 220, variant = 'card', showControls = true,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [mapType, setMapType] = useState('roadmap');
  const [pin, setPin] = useState(location?.lat ? { lat: location.lat, lng: location.lng } : null);

  useEffect(() => {
    if (location?.lat && location?.lng) setPin({ lat: location.lat, lng: location.lng });
  }, [location?.lat, location?.lng]);

  const hasCoords = pin?.lat != null && pin?.lng != null;

  const containerStyle = useMemo(() => ({
    width: '100%', height: `${height}px`, borderRadius: variant === 'card' ? 14 : 12,
  }), [height, variant]);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: showControls,
    styles: mapType === 'roadmap' ? MAP_STYLE : undefined,
    mapTypeId: mapType,
    gestureHandling: 'greedy',
    clickableIcons: false,
    backgroundColor: '#f8fafc',
  }), [mapType, showControls]);

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}${location?.placeId ? `&destination_place_id=${location.placeId}` : ''}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;
  const openMapUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}${location?.placeId ? `&query_place_id=${location.placeId}` : ''}`
    : directionsUrl;

  if (!API_KEY)   return <MissingKeyState variant={variant} height={height} />;
  if (loadError)  return <ErrorState variant={variant} height={height} message="Map failed to load." />;
  if (!isLoaded)  return <LoadingState variant={variant} height={height} />;
  if (!hasCoords) return <NoLocationState variant={variant} height={height} address={address} />;

  const map = (
    <div style={{ position: 'relative', borderRadius: containerStyle.borderRadius, overflow: 'hidden' }}>
      <GoogleMap mapContainerStyle={containerStyle} center={pin} zoom={16} options={mapOptions}>
        <CustomMarker position={pin} label={name} />
      </GoogleMap>

      {showControls && (
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
            title={mapType === 'roadmap' ? 'Switch to satellite' : 'Switch to map'}
            style={{
              width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(15,23,42,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: mapType === 'roadmap' ? '#64748B' : INDIGO,
            }}>
            <Layers size={15} />
          </button>
        </div>
      )}

      {directionsUrl && (
        <a href={directionsUrl} target="_blank" rel="noreferrer"
          style={{
            position: 'absolute', bottom: 12, left: 12,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 999, textDecoration: 'none',
            background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`, color: '#fff',
            fontSize: 11, fontWeight: 700, boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>
          <Navigation size={12} /> Directions
        </a>
      )}
    </div>
  );

  if (variant === 'plain') return map;

  return (
    <div className="glass-card overflow-hidden">
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin size={15} color={INDIGO} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
            {name || 'Your Estate'}
          </div>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {location?.formattedAddress || address || 'Location on map'}
          </div>
        </div>
        {openMapUrl && (
          <a href={openMapUrl} target="_blank" rel="noreferrer"
            style={{ padding: 8, borderRadius: 10, background: 'rgba(99,102,241,0.08)', color: INDIGO,
                     display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            title="Open in Google Maps">
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      <div style={{ padding: 12 }}>{map}</div>
    </div>
  );
}

// ── State variants ──────────────────────────────────────────────────────────
function shellStyle(variant, height) {
  const inner = { width: '100%', height, borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.04))',
    border: '1px dashed rgba(99,102,241,0.20)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 20, textAlign: 'center' };
  if (variant === 'plain') return { inner, outer: null };
  return { inner, outer: 'glass-card overflow-hidden' };
}

function LoadingState({ variant, height }) {
  const { inner, outer } = shellStyle(variant, height);
  const content = (
    <div style={inner}>
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke={INDIGO} strokeWidth="2.5" strokeOpacity=".2"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke={INDIGO} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Loading map…</div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
  return outer ? <div className={outer} style={{ padding: 12 }}>{content}</div> : content;
}

function ErrorState({ variant, height, message }) {
  const { inner, outer } = shellStyle(variant, height);
  const content = (
    <div style={inner}>
      <MapPin size={22} color="#EF4444" />
      <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>{message}</div>
    </div>
  );
  return outer ? <div className={outer} style={{ padding: 12 }}>{content}</div> : content;
}

function NoLocationState({ variant, height, address }) {
  const { inner, outer } = shellStyle(variant, height);
  const content = (
    <div style={inner}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MapPin size={20} color={INDIGO} />
      </div>
      <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 700 }}>Estate location unavailable</div>
      <div style={{ fontSize: 11, color: '#64748B', maxWidth: 260 }}>
        {address ? `"${address}" hasn't been mapped yet. Ask your estate manager to update it.` : 'Your estate manager hasn\'t set a location yet.'}
      </div>
    </div>
  );
  return outer ? <div className={outer} style={{ padding: 12 }}>{content}</div> : content;
}

function MissingKeyState({ variant, height }) {
  const { inner, outer } = shellStyle(variant, height);
  const content = (
    <div style={inner}>
      <MapPin size={22} color="#94A3B8" />
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>Map unavailable</div>
    </div>
  );
  return outer ? <div className={outer} style={{ padding: 12 }}>{content}</div> : content;
}

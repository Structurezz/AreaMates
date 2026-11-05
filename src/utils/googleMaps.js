// One shared Google Maps JS loader config. useJsApiLoader must get the same id
// and the same libraries array (by reference) everywhere, or the script is
// loaded twice / throws "Loader must not be called again with different options".
export const GOOGLE_MAPS_LOADER = {
  id: 'google-map-script',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places'],
};

export const hasMapsKey = () => !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/** Google Maps directions link for a place (server sends directionsUrl; fall back to lat/lng). */
export function directionsFor(place) {
  if (!place) return null;
  if (place.directionsUrl) return place.directionsUrl;
  if (place.lat != null && place.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  return null;
}

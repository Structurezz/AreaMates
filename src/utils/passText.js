import { TERMS, normType, categoryLabel, detailsSummary, DETAIL_LABELS } from './siteTypes';
import { directionsFor } from './googleMaps';

// Wording for the shareable visitor pass (image + WhatsApp text). Plain
// visitor passes read exactly as before ("GUEST PASS", purpose line).

const isCat = (v) => v?.category && v.category !== 'guest';

/** "GUEST PASS" / "CONTRACTOR PASS" / "PATIENT VISIT PASS" */
export const passKindLabel = (v) => (isCat(v) ? `${categoryLabel(v.category).toUpperCase()} PASS` : 'GUEST PASS');

/** Purpose line under the visitor's name on the pass image. */
export function passPurposeLine(v) {
  if (!isCat(v)) return v.purpose || '';
  const d = detailsSummary(v.details);
  return d ? `${categoryLabel(v.category)} · ${d}` : categoryLabel(v.category);
}

/** Site word for the "*Estate:*" line and the extra WhatsApp lines for category passes. */
export function passShareLines(v, estate) {
  const siteWord = TERMS[normType(estate?.site?.type)].site;
  // The host's hall / building (GET /visitors/:id → place) so the visitor can find it
  const url = directionsFor(v.place);
  const placeLines = v.place?.name ? `\n*Going to:* ${v.place.name}${url ? `\n*Directions:* ${url}` : ''}` : '';
  if (!isCat(v)) return { siteWord, extra: placeLines };
  const rows = Object.entries(DETAIL_LABELS)
    .map(([k, label]) => (v.details?.[k] && String(v.details[k]).trim() ? `\n*${label}:* ${v.details[k]}` : ''))
    .join('');
  return { siteWord, extra: `\n*Type:* ${categoryLabel(v.category)}${rows}${placeLines}` };
}

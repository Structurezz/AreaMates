import toast from 'react-hot-toast';
import { estateAPI } from '../api';

// Opens the estate constitution PDF in a new tab. The download route needs the
// auth header, so we fetch it through the API client and open a blob URL.
export default async function openConstitution(estateId, fileName = 'constitution.pdf') {
  if (!estateId) return;
  // Open the tab synchronously (inside the click) so popup blockers allow it
  const win = window.open('', '_blank');
  if (win) win.document.title = 'Opening constitution…';
  try {
    const { data } = await estateAPI.downloadConstitution(estateId);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    if (win) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    win?.close();
    let msg = 'Could not open the constitution';
    // Error bodies come back as Blobs because of responseType: 'blob'
    try { msg = JSON.parse(await err.response?.data?.text())?.message || msg; } catch { /* keep default */ }
    toast.error(msg);
  }
}

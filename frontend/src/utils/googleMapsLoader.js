// Shared Google Maps loader — supports libraries=places
// Loads the script once with all needed libraries
 
let state = 'idle'; // idle | loading | ready | error
const queue = [];
 
export const loadGoogleMaps = (apiKey) => {
  return new Promise((resolve, reject) => {
    // Already fully loaded with places
    if (window.google?.maps?.places) {
      resolve(window.google.maps);
      return;
    }
 
    // Already loaded but without places — need to reload with places
    // (only happens if another page loaded maps first without places)
    if (window.google?.maps && !window.google?.maps?.places) {
      // Load places library dynamically
      if (window.google.maps.importLibrary) {
        window.google.maps.importLibrary('places').then(() => {
          resolve(window.google.maps);
        }).catch(() => {
          // Fallback: resolve anyway, autocomplete just won't work
          resolve(window.google.maps);
        });
        return;
      }
      // Old API — resolve anyway
      resolve(window.google.maps);
      return;
    }
 
    // Queue the callback
    queue.push({ resolve, reject });
    if (queue.length > 1) return; // Already loading
 
    // Script tag already exists — wait for it
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (state === 'ready') { flushQueue(true); return; }
      const iv = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(iv);
          state = 'ready';
          flushQueue(true);
        }
      }, 100);
      return;
    }
 
    if (!apiKey) { flushQueue(false, 'No API key provided'); return; }
 
    state = 'loading';
 
    const callbackName = '__gMapsLoaded__';
    window[callbackName] = () => {
      delete window[callbackName];
      state = 'ready';
      flushQueue(true);
    };
 
    const script = document.createElement('script');
    // Always load with places library so autocomplete works everywhere
    const cleanKey = apiKey.split('&')[0]; // strip any extra params
    script.src = `https://maps.googleapis.com/maps/api/js?key=${cleanKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      state = 'error';
      flushQueue(false, 'Error al cargar Google Maps');
    };
    document.head.appendChild(script);
  });
};
 
function flushQueue(success, errMsg) {
  while (queue.length > 0) {
    const { resolve, reject } = queue.shift();
    if (success) resolve(window.google.maps);
    else reject(new Error(errMsg || 'Google Maps error'));
  }
}
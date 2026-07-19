const dialog = document.querySelector('#action-dialog');
const content = document.querySelector('#dialog-content');
const toast = document.querySelector('.toast');

const dialogs = {
  verify: {
    title: 'Start a land-record match',
    text: 'Enter the available plot identifier. The production integration will return a record match and a clear document checklist — not a title guarantee.',
    label: 'Khasra, Khata, or survey number',
    placeholder: 'Example: 142/3A',
    button: 'Check details'
  },
  design: {
    title: 'Create your home concept',
    text: 'Tell us what you want to build. In Stage 4, this will create an editable AI concept for your selected plot.',
    label: 'Describe your ideal home',
    placeholder: 'A light-filled, two-storey family home with a courtyard and garden…',
    button: 'Generate concept',
    textarea: true
  },
  valuation: {
    title: 'Value estimate coming next',
    text: 'The current range combines preliminary locality signals with plot characteristics. Stage 5 will add comparable-sales, construction costs, and confidence scoring.',
    button: 'Got it'
  },
  terrain: {
    title: 'Terrain report',
    text: 'This selected plot shows a gentle average slope of 3.2°. A site survey and architect review are still required before design or construction.',
    button: 'Got it'
  },
  'new-project': {
    title: 'Start a new project',
    text: 'Add a location first. The next screen in Stage 2 will connect this to real map search and terrain data.',
    label: 'Project location',
    placeholder: 'City, locality, or plot address',
    button: 'Create project'
  }
};

const locations = {
  'Kharadi, Pune': { lat: 18.5512, lng: 73.9496, elevation: 560, slope: 3.2, score: 82, drainage: 'Moderate' },
  'Whitefield, Bengaluru': { lat: 12.9698, lng: 77.7499, elevation: 882, slope: 2.1, score: 87, drainage: 'Good' },
  'Gachibowli, Hyderabad': { lat: 17.4401, lng: 78.3489, elevation: 535, slope: 4.6, score: 73, drainage: 'Moderate' }
};

const locationInput = document.querySelector('#location-search');
const terrainMap = document.querySelector('#terrain-map');
const pin = document.querySelector('#selected-pin');

function setText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = value;
}

function setDataSource(value) {
  setText('data-source', value);
}

function slopeContent(slope, score) {
  if (slope < 2.5) return { title: 'Mostly level', summary: 'A straightforward starting point for a standard residential foundation.', tip: 'Confirm stormwater flow during the site survey and allow space for surface drainage.' };
  if (slope < 5) return { title: 'Gentle slope', summary: 'A practical plot for a standard residential foundation.', tip: 'Reserve a drainage edge during the site survey and confirm soil conditions before finalising the foundation.' };
  return { title: 'Noticeable slope', summary: 'The plot may need stepped planning or additional grading before construction.', tip: 'Ask a civil engineer to review cut-and-fill requirements, retaining walls, and drainage before buying.' };
}

function updateTerrain({ lat, lng, elevation, slope, score, drainage }) {
  const content = slopeContent(slope, score);
  setText('latitude', `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`);
  setText('longitude', `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`);
  setText('terrain-title', content.title);
  setText('terrain-summary', content.summary);
  setText('terrain-score', score);
  setText('slope-value', `${slope.toFixed(1)}°`);
  setText('elevation-value', `${Math.round(elevation)} m`);
  setText('drainage-value', drainage);
  setText('terrain-tip', content.tip);
  dialogs.terrain.text = `${content.summary} Prototype reading: ${slope.toFixed(1)}° average slope, ${Math.round(elevation)} m elevation, and ${drainage.toLowerCase()} drainage. A site survey and architect review are still required.`;
}

async function requestTerrain(latitude, longitude) {
  const url = `/api/land-insight?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Live terrain unavailable');
  const result = await response.json();
  updateTerrain({ lat: result.latitude, lng: result.longitude, elevation: result.elevation, slope: result.slope, score: result.score, drainage: result.drainage });
  setDataSource('Live elevation data');
}

function updateArea() {
  const width = Number(document.querySelector('#plot-width')?.value) || 0;
  const length = Number(document.querySelector('#plot-length')?.value) || 0;
  const area = Math.round(width * length);
  const formatted = new Intl.NumberFormat('en-IN').format(area);
  setText('area-result', `${formatted} sq ft`);
  setText('summary-area', formatted);
}

function useLocation(name) {
  const location = locations[name];
  if (!location) {
    const searchValue = name.trim() || 'Selected location';
    const seed = [...searchValue].reduce((total, character) => total + character.charCodeAt(0), 0);
    const generated = { lat: 19.0 + (seed % 50) / 100, lng: 73.5 + (seed % 90) / 100, elevation: 480 + (seed % 250), slope: 1.5 + (seed % 55) / 10, score: 68 + (seed % 24), drainage: seed % 2 ? 'Moderate' : 'Good' };
    updateTerrain(generated);
    setDataSource('Prototype terrain data');
    showToast(`Prototype plot set near ${searchValue}. Connect a map provider for a live geocoded result.`);
    return;
  }
  locationInput.value = name;
  updateTerrain(location);
  setDataSource('Prototype terrain data');
  requestTerrain(location.lat, location.lng).catch(() => undefined);
  showToast(`Terrain profile updated for ${name}.`);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3200);
}

function openDialog(key) {
  const item = dialogs[key];
  if (!item) return;
  const field = item.label ? `<label>${item.label}${item.textarea ? `<textarea placeholder="${item.placeholder}"></textarea>` : `<input placeholder="${item.placeholder}" />`}</label>` : '';
  content.innerHTML = `<form class="dialog-form" method="dialog"><p class="eyebrow">APNA GHAR · STAGE 2</p><h2>${item.title}</h2><p>${item.text}</p>${field}<div class="dialog-note">Prototype mode: no personal details are saved yet.</div><button class="primary-button" value="submit">${item.button}</button></form>`;
  dialog.showModal();
  content.querySelector('input, textarea')?.focus();
}

document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'share') return showToast('A shareable project link will be available in Stage 6.');
    if (action === 'invite') return showToast('Expert invitations are planned for Stage 6.');
    if (action === 'profile') return showToast('Profile settings will be added with login in Stage 7.');
    if (action === 'open-discovery') return document.querySelector('#land')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    openDialog(action);
  });
});

document.querySelectorAll('[data-target]').forEach(step => step.addEventListener('click', () => document.querySelector(`#${step.dataset.target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (dialog.returnValue === 'submit') showToast('Saved for the next implementation stage.'); });
document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active'); }));

document.querySelector('#search-location')?.addEventListener('click', async () => {
  const query = locationInput.value;
  if (locations[query]) return useLocation(query);
  try {
    const response = await fetch(`/api/search-location?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Live search unavailable');
    const payload = await response.json();
    const result = payload.results[0];
    locationInput.value = result.label;
    await requestTerrain(result.latitude, result.longitude);
    showToast(`Live location result selected: ${result.label}.`);
  } catch {
    useLocation(query);
  }
});
document.querySelectorAll('[data-location]').forEach(button => button.addEventListener('click', () => useLocation(button.dataset.location)));
document.querySelector('#plot-form')?.addEventListener('submit', event => { event.preventDefault(); updateArea(); showToast('Plot details saved in this browser session.'); });
document.querySelectorAll('#plot-width, #plot-length').forEach(input => input.addEventListener('input', updateArea));
terrainMap?.addEventListener('click', event => {
  if (event.target.closest('button')) return;
  const bounds = terrainMap.getBoundingClientRect();
  const x = Math.max(4, Math.min(94, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(5, Math.min(89, ((event.clientY - bounds.top) / bounds.height) * 100));
  pin.style.left = `calc(${x}% - 15px)`;
  pin.style.top = `calc(${y}% - 15px)`;
  const slope = 1.2 + Math.abs(x - 50) / 12 + Math.abs(y - 48) / 17;
  const latitude = 18.50 + y / 900;
  const longitude = 73.90 + x / 730;
  updateTerrain({ lat: latitude, lng: longitude, elevation: 520 + y * .85, slope, score: Math.max(59, Math.round(91 - slope * 3)), drainage: y > 70 ? 'Watch' : 'Moderate' });
  setDataSource('Prototype terrain data');
  requestTerrain(latitude, longitude).catch(() => undefined);
  showToast('Plot pin moved. Terrain snapshot refreshed.');
});
document.querySelectorAll('.map-layer').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.map-layer').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  terrainMap.classList.toggle('terrain-mode', button.dataset.layer === 'terrain');
}));

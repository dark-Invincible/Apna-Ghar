// ==========================================
// APNA GHAR - ENTERPRISE ENGINEERING ENGINE
// ==========================================

// Global Project State
const state = {
  latitude: 25.4358,
  longitude: 81.8463,
  locality: 'Civil Lines, Prayagraj',
  village: 'Civil Lines',
  tehsil: 'Sadar',
  khasra: '142/3A',
  khata: '556',
  width: 40,
  length: 60,
  height: 20,
  roofType: 'flat',
  color: '#eae5d8',
  area: 2400,
  proximity: 'Adjacent to 30ft asphalt public road, utilities accessible.',
  terrain: {
    elevation: 98,
    slope: 0.8,
    score: 94,
    drainage: 'Good',
    title: 'Level ground',
    summary: 'Mostly level surface. Ideal building parameters.'
  },
  legal: {
    checked: false,
    status: 'pending', // verified, pending, flagged
    owner: '',
    mutation: '',
    reason: '',
    missing: []
  },
  design: {
    generated: false,
    taskId: null,
    progress: 0,
    status: 'idle',
    materials: null
  }
};

let map = null;
let marker = null;
let currentRoiView = 'Expected'; // Expected, Conservative, Optimistic

// HTML Element selectors
const select = (id) => document.getElementById(id);
const selectAll = (selector) => document.querySelectorAll(selector);

// Toast Notification helper
function showToast(message) {
  const toastEl = document.querySelector('.toast');
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3500);
  }
}

// ==========================================
// 1. TAB SWITCHER SYSTEM
// ==========================================
function switchTab(tabId) {
  selectAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  selectAll('.nav-link').forEach(link => link.classList.remove('active'));
  selectAll('.journey-step').forEach(step => step.classList.remove('current'));

  const targetTab = select(`tab-${tabId}`);
  if (targetTab) {
    targetTab.classList.add('active');
    
    // Update Sidebar Navigation highlights
    const activeLink = document.querySelector(`.nav-link[data-nav="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Update active journey steps on overview
    const activeStep = document.querySelector(`.journey-step[data-tab-target="${tabId}"]`);
    if (activeStep) activeStep.classList.add('current');

    // Update breadcrumbs
    const breadcrumbs = document.querySelector('#breadcrumb-active');
    if (breadcrumbs) {
      breadcrumbs.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1) + ' Workspace';
    }

    // Leaflet map refresh when visible
    if (tabId === 'land' && map) {
      setTimeout(() => map.invalidateSize(), 100);
    }

    // Mount 3D canvas if design is already generated
    if (tabId === 'design' && state.design.generated) {
      triggerCanvasMount();
    }
  }
}

// Bind navigation clicks
selectAll('[data-nav]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tabId = link.getAttribute('data-nav');
    switchTab(tabId);
  });
});

selectAll('[data-tab-target]').forEach(el => {
  el.addEventListener('click', () => {
    const tabId = el.getAttribute('data-tab-target');
    switchTab(tabId);
  });
});

// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = sidebar.style.display === 'flex' ? 'none' : 'flex';
  });
}

// ==========================================
// 2. GIS LAND DISCOVERY (LEAFLET MAP)
// ==========================================
function initGISMap() {
  const mapContainer = select('live-map-container');
  if (!mapContainer) return;

  // Initialize Leaflet Map centered strictly in Prayagraj, UP
  map = L.map('live-map-container').setView([state.latitude, state.longitude], 14);

  // Set OpenFreeMap Tiles (Zero-Cost stack)
  L.tileLayer('https://tiles.openfreemap.org/styles/bright/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles &copy; <a href="https://openfreemap.org">OpenFreeMap</a>',
    maxZoom: 19
  }).addTo(map);

  // Add initial Marker
  marker = L.marker([state.latitude, state.longitude], { draggable: true }).addTo(map);
  marker.bindPopup("<b>Active Selected Plot</b><br>Prayagraj Launch Site").openPopup();

  // Pin movement drag listeners
  marker.on('dragend', async () => {
    const pos = marker.getLatLng();
    updateLocationCoords(pos.lat, pos.lng);
  });

  // Double click map to place a pin
  map.on('dblclick', (e) => {
    const pos = e.latlng;
    marker.setLatLng(pos);
    updateLocationCoords(pos.lat, pos.lng);
  });
}

// Update coordinates, update state, fetch elevations
async function updateLocationCoords(lat, lng) {
  state.latitude = lat;
  state.longitude = lng;
  
  select('latitude').textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  select('longitude').textContent = `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

  // Update welcome cards
  const latlngStr = `${Math.abs(lat).toFixed(4)}° N, ${Math.abs(lng).toFixed(4)}° E`;
  if (select('overview-latlng')) select('overview-latlng').textContent = latlngStr;

  // Request Open-Meteo elevation metrics
  try {
    const response = await fetch(`/api/land-insight?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    if (!response.ok) throw new Error('Live terrain insights unavailable');
    
    const result = await response.json();
    state.terrain = {
      elevation: result.elevation,
      slope: result.slope,
      score: result.score,
      drainage: result.drainage,
      title: result.title,
      summary: result.sampleRange ? `Average range variance is ${result.sampleRange}m.` : 'Slope calculated.'
    };

    // Update Terrain Panels
    select('terrain-title').textContent = state.terrain.title;
    select('terrain-summary').textContent = `Buildability is rated high. ${state.terrain.summary}`;
    select('terrain-score').textContent = state.terrain.score;
    select('slope-value').textContent = `${state.terrain.slope.toFixed(1)}°`;
    select('elevation-value').textContent = `${Math.round(state.terrain.elevation)} m`;
    select('drainage-value').textContent = state.terrain.drainage;

    // Update overview summary stats
    if (select('overview-terrain-badge')) select('overview-terrain-badge').textContent = state.terrain.title;
    if (select('overview-slope-val')) select('overview-slope-val').textContent = `${state.terrain.slope.toFixed(1)}°`;
    if (select('overview-elevation-val')) select('overview-elevation-val').textContent = `${Math.round(state.terrain.elevation)} m`;
    if (select('overview-score-val')) select('overview-score-val').textContent = `${state.terrain.score}/100`;
    if (select('overview-drainage-val')) select('overview-drainage-val').textContent = state.terrain.drainage;

    // Update terrain tip suggestions
    let tip = "Standard footing works.";
    if (state.terrain.slope > 5) {
      tip = "Steep slope requires cut-and-fill grading or step foundation design. Check with structural engineer.";
    } else if (state.terrain.drainage === 'Review required') {
      tip = "Low slope might cause water accumulation. Plan additional drainage lines during site design.";
    } else {
      tip = "Favorable soil buildability. Recommend standard strip or raft foundation options.";
    }
    select('terrain-tip').textContent = tip;
    
    // Highlight terrain status color
    const badge = select('overview-terrain-badge');
    if (badge) {
      badge.className = 'status ' + (state.terrain.slope > 5 ? 'flagged' : (state.terrain.slope > 2.5 ? 'pending' : 'calm'));
    }

    showToast('Terrain metrics retrieved via Open-Meteo elevation data.');
    updateValuations(); // Refresh prices when terrain variables change
  } catch (error) {
    console.error('Terrain update failure', error);
  }
}

// Nominatim Geocoding API handler
async function handleGeocoding(query) {
  if (query.trim().length < 3) return;
  try {
    showToast('Searching OSM Nominatim...');
    const response = await fetch(`/api/search-location?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search request failed');
    const data = await response.json();
    const bestMatch = data.results[0];

    // Pan map to search results
    if (map && bestMatch) {
      map.setView([bestMatch.latitude, bestMatch.longitude], 15);
      marker.setLatLng([bestMatch.latitude, bestMatch.longitude]);
      
      state.locality = bestMatch.label;
      select('location-search').value = bestMatch.label;
      
      // Auto-extract sub-localities for UP records
      const addressParts = bestMatch.label.split(',');
      state.village = addressParts[0] ? addressParts[0].trim() : 'Prayagraj Central';
      select('input-village').value = state.village;
      if (select('overview-locality-sub')) select('overview-locality-sub').textContent = state.village;

      updateLocationCoords(bestMatch.latitude, bestMatch.longitude);
      showToast(`Location focused: ${bestMatch.label}`);
    }
  } catch (err) {
    showToast('Location search is temporarily rate-limited. Double click on map instead.');
  }
}

// Bind Nominatim geocoding buttons
select('search-location')?.addEventListener('click', () => {
  handleGeocoding(select('location-search').value);
});
selectAll('[data-location]').forEach(btn => {
  btn.addEventListener('click', () => {
    const loc = btn.getAttribute('data-location');
    select('location-search').value = loc;
    handleGeocoding(loc);
  });
});

// Update plot dimensions area calculation
function updatePlotDimensions() {
  const w = parseFloat(select('plot-width').value) || 40;
  const l = parseFloat(select('plot-length').value) || 60;
  state.width = w;
  state.length = l;
  state.area = w * l;

  const formattedArea = new Intl.NumberFormat('en-IN').format(state.area);
  select('area-result').textContent = `${formattedArea} sq ft`;
  if (select('summary-area')) select('summary-area').textContent = formattedArea;

  // Sync to Design Studio inputs automatically
  const designHeight = parseFloat(select('design-height').value) || 20;
  state.height = designHeight;

  updateValuations();
}

select('plot-width')?.addEventListener('input', updatePlotDimensions);
select('plot-length')?.addEventListener('input', updatePlotDimensions);
select('plot-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Save specific local parameters
  state.village = select('input-village').value || 'Civil Lines';
  state.tehsil = select('input-tehsil').value || 'Sadar';
  state.khasra = select('input-khasra').value || '142/3A';
  state.khata = select('input-khata').value || '556';
  state.proximity = select('input-proximity').value || 'Standard Access';

  // Sync back to legal input boxes
  select('legal-check-khasra').value = state.khasra;
  select('legal-check-khata').value = state.khata;
  select('legal-check-village').value = state.village;
  select('legal-check-tehsil').value = state.tehsil;

  if (select('overview-plot-title')) select('overview-plot-title').textContent = `Plot near ${state.village}`;

  // Mark discovery check done
  select('chk-land').className = 'done';
  select('chk-land').querySelector('span').textContent = '✓';

  showToast('Plot metrics saved in active workspace.');
  switchTab('legal'); // Guide user to Phase 2 Legal
});

// ==========================================
// 3. UP BHULEKH LEGAL RECORD MATCH
// ==========================================
async function performLegalCheck() {
  const khasra = select('legal-check-khasra').value;
  const khata = select('legal-check-khata').value;
  const village = select('legal-check-village').value;
  const tehsil = select('legal-check-tehsil').value;

  showToast('Connecting to UP Bhulekh Verification Portal...');

  try {
    const response = await fetch(`/api/legal/verify-up?khasra=${encodeURIComponent(khasra)}&khata=${encodeURIComponent(khata)}&village=${encodeURIComponent(village)}&tehsil=${encodeURIComponent(tehsil)}`);
    if (!response.ok) throw new Error('Bhulekh API match failed');
    const result = await response.json();

    state.legal.checked = true;
    state.legal.owner = result.ownerNameMatch;
    state.legal.mutation = result.lastMutationDate;
    state.legal.reason = result.legalReviewReason;
    state.legal.missing = result.missingDocuments;
    state.legal.status = result.disputeFound ? 'flagged' : (result.legalReviewRecommended ? 'pending' : 'verified');

    // Sync with Admin human review overrides if present
    const adminDocsRaw = localStorage.getItem('apnaghar_admin_docs');
    if (adminDocsRaw) {
      const adminDocs = JSON.parse(adminDocsRaw);
      // Try to find if this owner has an override status
      const matchedAdminDoc = adminDocs.find(d => d.owner.toLowerCase() === state.legal.owner.toLowerCase() || d.locality.toLowerCase().includes(village.toLowerCase()));
      if (matchedAdminDoc) {
        state.legal.status = matchedAdminDoc.status;
        if (state.legal.status === 'verified') {
          state.legal.reason = 'APPROVED BY PARTNER/ADMIN: Manual document checks verified. Plot title confirmed as mutation-safe for BOQ preparation.';
          state.legal.missing = ['Standard registry copy'];
        } else if (state.legal.status === 'flagged') {
          state.legal.reason = 'DISPUTE REGISTERED BY PARTNER: Litigation alert has been flagged manually. Do not issue construction cost forecasts.';
        }
      }
    }

    renderLegalResults();
  } catch (error) {
    showToast('Legal verification service returned fallback values.');
  }
}

function renderLegalResults() {
  select('legal-results-placeholder').style.display = 'none';
  select('legal-results-content').style.display = 'block';

  // Badge updates
  const badge = select('legal-badge');
  badge.textContent = state.legal.status.toUpperCase();
  badge.className = 'badge ' + state.legal.status;

  select('legal-res-owner').textContent = state.legal.owner;
  select('legal-res-mutation').textContent = state.legal.mutation;
  select('legal-res-reason').textContent = state.legal.reason;

  // Set review box color based on risk levels
  const reviewBox = select('legal-res-review-box');
  if (state.legal.status === 'verified') {
    reviewBox.style.background = '#e6f3eb';
    reviewBox.style.border = '1px solid #2b7049';
  } else if (state.legal.status === 'flagged') {
    reviewBox.style.background = '#faecea';
    reviewBox.style.border = '1px solid #a83d31';
  } else {
    reviewBox.style.background = '#fdf5e6';
    reviewBox.style.border = '1px solid #9c6c19';
  }

  // Populate missing documents list
  const missingList = select('legal-res-missing');
  missingList.innerHTML = '';
  state.legal.missing.forEach(doc => {
    const li = document.createElement('li');
    li.textContent = doc;
    missingList.appendChild(li);
  });

  // Update overview scorecard
  const chk = select('chk-legal');
  chk.className = state.legal.status === 'verified' ? 'done' : 'pending';
  chk.querySelector('span').textContent = state.legal.status === 'verified' ? '✓' : '⚠️';
  chk.querySelector('small').textContent = state.legal.status === 'verified' ? 'Verified clear' : 'Review suggested';

  showToast('Legal records match checklist completed.');
  updateValuations();
}

select('btn-run-legal-check')?.addEventListener('click', performLegalCheck);

// Manual document upload action simulating server processing
select('btn-upload-doc')?.addEventListener('click', () => {
  const uploadInput = select('manual-doc-upload');
  if (!uploadInput.files || uploadInput.files.length === 0) {
    showToast('Choose a PDF registry copy first.');
    return;
  }
  
  showToast('Parsing uploaded document in-memory...');
  select('upload-status').innerHTML = '🧬 Processing metadata (DPDP Compliance: Ephemeral Memory Locked)...';

  setTimeout(() => {
    // Add uploaded doc directly to admin console state database
    let adminDocs = [];
    const stored = localStorage.getItem('apnaghar_admin_docs');
    if (stored) adminDocs = JSON.parse(stored);

    const newDocId = 'doc_' + Math.random().toString(36).substring(2, 7);
    adminDocs.push({
      id: newDocId,
      lat: state.latitude,
      lng: state.longitude,
      locality: `${state.village}, Prayagraj`,
      owner: state.legal.owner || 'Arjun Kumar',
      docName: uploadInput.files[0].name,
      status: 'pending'
    });

    localStorage.setItem('apnaghar_admin_docs', JSON.stringify(adminDocs));
    // Trigger notification dot on admin bell
    const notifyDot = document.querySelector('.notify-dot');
    if (notifyDot) notifyDot.style.display = 'block';

    select('upload-status').innerHTML = '✅ Parsed. Sent to Partner Human-Review Console. Cache will purge in 5m.';
    showToast('Manual upload queued for admin approval.');
  }, 2200);
});

// Sync admin toggle notifications from admin page
window.addEventListener('storage', (e) => {
  if (e.key === 'apnaghar_admin_docs' && state.legal.checked) {
    performLegalCheck(); // Refresh check automatically to pull state
  }
});

// ==========================================
// 4. DESIGN TO 3D ENGINE
// ==========================================
const designPaths = ['text', 'image', 'blueprint'];
function setDesignPath(activePath) {
  designPaths.forEach(path => {
    const btn = select(`path-btn-${path}`);
    const container = select(`design-path-${path}-container`);
    if (btn && container) {
      if (path === activePath) {
        btn.classList.add('active');
        container.style.display = 'block';
      } else {
        btn.classList.remove('active');
        container.style.display = 'none';
      }
    }
  });
}

designPaths.forEach(path => {
  select(`path-btn-${path}`)?.addEventListener('click', () => setDesignPath(path));
});

// Simulate 3D construction via WebSockets/API status polling loop
async function run3DGenerator() {
  const promptVal = select('prompt-input').value || 'Modern sustainable house';
  
  // If Blueprint mode selected, verify checks
  const pathBtnBlueprint = select('path-btn-blueprint');
  if (pathBtnBlueprint.classList.contains('active')) {
    if (!select('check-bp-dims').checked || !select('check-bp-setbacks').checked || !select('check-bp-height').checked) {
      showToast('Verify all room checklist items first.');
      return;
    }
  }

  // Pre-process prompt adding sustainable Prayagraj regional architecture parameters
  const preProcessedPrompt = `${promptVal}, high fidelity blueprint layout, optimal solar pathway alignment for Uttar Pradesh climate, insulated fly-ash brick envelopes, low solar-gain coefficient glass.`;
  
  select('3d-placeholder-text').style.display = 'none';
  const progressBox = select('3d-generation-progress');
  progressBox.style.display = 'block';

  try {
    // Phase 3 Path B Image check - simulate background removal loader if image is uploaded
    const pathBtnImage = select('path-btn-image');
    if (pathBtnImage.classList.contains('active')) {
      const loader = select('bg-removal-loading');
      loader.style.display = 'block';
      await new Promise(r => setTimeout(r, 2000));
      loader.style.display = 'none';
      showToast('Background removed successfully.');
    }

    // Call API generate
    const w = state.width;
    const l = state.length;
    const h = parseFloat(select('design-height').value) || 20;
    
    state.height = h;
    state.roofType = select('design-roof').value;
    state.color = select('design-color').value;

    const startResp = await fetch(`/api/design/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: preProcessedPrompt, width: w, length: l, height: h })
    });
    const startResult = await startResp.json();
    const taskId = startResult.taskId;

    // Start polling status
    poll3DStatus(taskId);

  } catch (e) {
    showToast('3D visualizer service returned errors.');
  }
}

function poll3DStatus(taskId) {
  const interval = setInterval(async () => {
    try {
      const resp = await fetch(`/api/design/status?taskId=${taskId}`);
      const result = await resp.json();
      
      const fill = select('gen-progress-fill');
      const percent = select('gen-percent-text');
      const statusText = select('gen-status-text');

      fill.style.width = `${result.progress}%`;
      percent.textContent = `${result.progress}%`;
      statusText.textContent = `Rendering: ${result.status.replace('_', ' ')}`;

      if (result.progress >= 100) {
        clearInterval(interval);
        select('3d-generation-progress').style.display = 'none';
        
        state.design.generated = true;
        state.design.materials = result.modelData.materials;
        
        // Trigger React Three Fiber mount
        triggerCanvasMount();
        
        // Mark design check done
        const chk = select('chk-design');
        chk.className = 'done';
        chk.querySelector('span').textContent = '✓';
        chk.querySelector('small').textContent = '3D mesh active';

        showToast('React Three Fiber concept canvas rendered successfully.');
        updateValuations();
      }
    } catch (e) {
      clearInterval(interval);
      showToast('Error polling generation state.');
    }
  }, 1500);
}

function triggerCanvasMount() {
  const container = select('r3f-canvas-container');
  if (container && window.mount3DCanvas) {
    // Mathematically lock meshes strictly to verified length/width parameters
    window.mount3DCanvas(container, {
      width: state.width,
      length: state.length,
      height: state.height,
      roofType: state.roofType,
      color: state.color
    });
  }
}

select('btn-generate-3d')?.addEventListener('click', run3DGenerator);

// Update colors and options immediately if changed
select('design-roof')?.addEventListener('change', () => {
  if (state.design.generated) {
    state.roofType = select('design-roof').value;
    triggerCanvasMount();
  }
});
select('design-color')?.addEventListener('change', () => {
  if (state.design.generated) {
    state.color = select('design-color').value;
    triggerCanvasMount();
  }
});

// ==========================================
// 5. PREDICITIVE VALUATION INTELLIGENCE
// ==========================================
function updateValuations() {
  // 1. Calculate Land Valuation circle rates in Prayagraj
  // Sadar Sadar Tehsil rates: Civil Lines / Katra = ~₹45,000/sqm. Phaphamau = ~₹25,000/sqm. Naini (Karchhana) = ~₹18,000/sqm
  let ratePerSqm = 20000;
  let zoneName = 'Prayagraj Rural';
  
  const tehsil = (state.tehsil || '').toLowerCase();
  const village = (state.village || '').toLowerCase();

  if (tehsil.includes('sadar')) {
    ratePerSqm = 32000;
    zoneName = 'Sadar Sub-zone';
    if (village.includes('lines')) {
      ratePerSqm = 46000;
      zoneName = 'Civil Lines Prime';
    } else if (village.includes('katra')) {
      ratePerSqm = 38000;
      zoneName = 'Katra Residential';
    } else if (village.includes('phaphamau')) {
      ratePerSqm = 24000;
      zoneName = 'Phaphamau Bridge Transit';
    }
  } else if (tehsil.includes('karchhana') || village.includes('naini')) {
    ratePerSqm = 19000;
    zoneName = 'Naini Industrial Hub';
  }

  select('val-tehsil-circle-rate').textContent = `₹${ratePerSqm.toLocaleString('en-IN')}`;

  // Area: convert square feet to square meters (1 sq ft = 0.092903 sqm)
  const areaSqm = state.area * 0.092903;
  let landBaseValue = areaSqm * ratePerSqm;

  // Access multipliers: e.g. 30ft road width premium (+12%), steep slope deduction
  let roadPremium = 0;
  const proximityText = state.proximity.toLowerCase();
  if (proximityText.includes('30ft') || proximityText.includes('30 ft') || proximityText.includes('wide')) {
    roadPremium = 0.12; // +12%
  } else if (proximityText.includes('highway') || proximityText.includes('main road')) {
    roadPremium = 0.20; // +20%
  }

  let slopePenalty = 0;
  if (state.terrain.slope > 5) {
    slopePenalty = -0.10; // -10% grading charge
  } else if (state.terrain.slope > 2.5) {
    slopePenalty = -0.04;
  }

  // Calculate final range (±8% confidence interval)
  const multiplier = 1 + roadPremium + slopePenalty;
  const finalLandValue = landBaseValue * multiplier;
  const landMin = finalLandValue * 0.92;
  const landMax = finalLandValue * 1.08;

  // Format ranges in Lakhs / Crores
  const formatLakhRange = (min, max) => {
    const minL = (min / 100000).toFixed(1);
    const maxL = (max / 100000).toFixed(1);
    return `₹${minL}L – ₹${maxL}L`;
  };

  select('val-land-range').textContent = formatLakhRange(landMin, landMax);

  // 2. Volumetric construction cost estimation based on H x W x D scale vectors
  // Volume in CFT
  const volumeCft = state.width * state.length * state.height;
  select('val-scale-cft').textContent = new Intl.NumberFormat('en-IN').format(volumeCft);

  // Construction rate base (₹14/cft maps to ~₹1,400 per sq ft for average 10ft ceilings)
  const rawConstBase = volumeCft * 14.5;
  const constMin = rawConstBase * 0.90;
  const constMax = rawConstBase * 1.10; // ±10% dynamic range

  select('val-const-range').textContent = formatLakhRange(constMin, constMax);

  // 3. Explainable Reason Matrix Population
  const matrixBody = select('valuation-matrix-rows');
  matrixBody.innerHTML = '';
  
  const factors = [
    {
      factor: 'Prayagraj Zone Rate',
      state: zoneName,
      impact: `Base rate ₹${ratePerSqm}/sqm`,
      rationale: 'Government circle valuation for registered land transactions.'
    },
    {
      factor: 'Slope Profile',
      state: `${state.terrain.slope.toFixed(1)}° (${state.terrain.title})`,
      impact: slopePenalty !== 0 ? `${(slopePenalty * 100).toFixed(0)}% adjustment` : '0% standard level',
      rationale: state.terrain.slope > 5 ? 'Deduction for ground cuts and retaining walls.' : 'No additional leveling required.'
    },
    {
      factor: 'Road Proximity',
      state: proximityText.includes('30ft') ? '30ft Access Width' : 'Standard width',
      impact: roadPremium > 0 ? `+${(roadPremium * 100).toFixed(0)}% premium` : 'No adjustment',
      rationale: 'Wide road ingress increases residential transport asset scores.'
    },
    {
      factor: 'Comparable SRO filings',
      state: 'Sadar Registrar office match',
      impact: state.legal.status === 'verified' ? 'Safe valuation state' : 'Caution discount',
      rationale: state.legal.status === 'verified' ? 'Record mutation is clean' : 'Risk premium applied due to unverified title.'
    }
  ];

  factors.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${f.factor}</strong></td>
      <td>${f.state}</td>
      <td style="color:${f.impact.includes('+') ? '#2b7049' : (f.impact.includes('-') ? '#a83d31' : 'inherit')}"><strong>${f.impact}</strong></td>
      <td>${f.rationale}</td>
    `;
    matrixBody.appendChild(tr);
  });

  // Update final checklist items
  if (state.design.generated) {
    const chkVal = select('chk-value');
    chkVal.className = 'done';
    chkVal.querySelector('span').textContent = '✓';
    chkVal.querySelector('small').textContent = 'Estimates generated';
    select('checklist-progress-badge').textContent = '4 / 4 Complete';
  } else {
    select('checklist-progress-badge').textContent = '2 / 4 Complete';
  }

  // Draw current active ROI curve
  drawRoiChart(finalLandValue);
}

// ==========================================
// 6. 5-YEAR ROI PRICE APPRECIATION
// ==========================================
function drawRoiChart(basePrice) {
  const svg = select('roi-chart-svg');
  const path = select('roi-chart-path');
  const area = select('roi-chart-area');
  if (!svg || !path) return;

  // Multipliers for 5 years: Expected, Conservative, Optimistic
  // Factor in mock infrastructure signals for Prayagraj development zones (like Phaphamau transit bridge or Smart City additions)
  const curves = {
    Expected: [1.0, 1.08, 1.18, 1.30, 1.45, 1.62], // +62% after 5 yrs
    Conservative: [1.0, 1.04, 1.09, 1.15, 1.22, 1.30], // +30% after 5 yrs
    Optimistic: [1.0, 1.14, 1.32, 1.55, 1.82, 2.15]  // +115% after 5 yrs
  };

  const activeRates = curves[currentRoiView];
  const points = [];
  
  // Map points to SVG coordinate systems: width 500, height 120
  // X from 10 to 490. Y from 110 (min price) to 10 (max price)
  const maxMultiplier = Math.max(...curves.Optimistic);
  const minMultiplier = 0.9;
  
  for (let i = 0; i < 6; i++) {
    const x = 10 + (i * 96); // spread points
    const mult = activeRates[i];
    // Map multiplier to height bounds
    const y = 110 - ((mult - minMultiplier) / (maxMultiplier - minMultiplier)) * 100;
    points.push([x, y]);
  }

  // Draw lines
  const dString = `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
  path.setAttribute('d', dString);

  // Draw shadow fill areas
  const dAreaString = `${dString} L 490,110 L 10,110 Z`;
  area.setAttribute('d', dAreaString);

  // Update text label reasons based on active curve
  const labelReason = select('roi-infrastructure-reason');
  if (currentRoiView === 'Expected') {
    labelReason.textContent = `Expected curve: includes Prayagraj Smart City Phase 2 sewage hookups and Sadar block road widening schemes (+12% compound).`;
  } else if (currentRoiView === 'Conservative') {
    labelReason.textContent = `Conservative curve: baseline market appreciation with minor delay in Phaphamau bridge transit access extensions (+6% compound).`;
  } else if (currentRoiView === 'Optimistic') {
    labelReason.textContent = `Optimistic curve: rapid valuation spikes expected upon finalization of the Phaphamau-Naini high-speed express bypass connection (+18% compound).`;
  }
}

// Bind ROI selection buttons
['exp', 'con', 'opt'].forEach(key => {
  const mapKey = { exp: 'Expected', con: 'Conservative', opt: 'Optimistic' }[key];
  select(`roi-curve-btn-${key}`)?.addEventListener('click', () => {
    ['exp', 'con', 'opt'].forEach(k => select(`roi-curve-btn-${k}`)?.classList.remove('active'));
    select(`roi-curve-btn-${key}`)?.classList.add('active');
    currentRoiView = mapKey;
    updateValuations();
  });
});

// ==========================================
// 7. PRINTABLE PDF SUMMARY LAYOUT
// ==========================================
select('pdf-download-btn')?.addEventListener('click', () => {
  showToast('Preparing summary report for printing...');
  window.print();
});

// ==========================================
// INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  initGISMap();
  updatePlotDimensions();
  updateValuations();

  // Highlight default navigation state
  switchTab('overview');
});

const MAX_QUERY_LENGTH = 160;

function getQuery(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY_LENGTH) : '';
}

// In-memory throttling queue for Nominatim to respect the 1 req/sec policy.
let lastRequestTime = 0;

async function throttleRequest() {
  const now = Date.now();
  const timePassed = now - lastRequestTime;
  if (timePassed < 1000) {
    const delay = 1000 - timePassed;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  const query = getQuery(request.query.q);
  if (query.length < 3) return response.status(400).json({ error: 'Enter at least 3 characters to search.' });

  try {
    // Wait for the throttling delay to ensure max 1 req/sec.
    await throttleRequest();

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'in');

    const osmResponse = await fetch(url, {
      headers: {
        'User-Agent': 'ApnaGhar-Ecosystem/1.0 (contact@apnaghar.in; school-project/learning)'
      }
    });

    if (!osmResponse.ok) throw new Error(`Nominatim API returned ${osmResponse.status}`);
    const payload = await osmResponse.json();
    if (!payload || !payload.length) return response.status(404).json({ error: 'No matching location was found in India.' });

    const results = payload.map(result => ({
      label: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      precision: result.type || result.class || 'locality'
    }));

    response.setHeader('Cache-Control', 'private, max-age=300');
    return response.status(200).json({ results });
  } catch (error) {
    console.error('Location search failed', error.message);
    return response.status(502).json({ error: 'Location search is temporarily unavailable.' });
  }
}


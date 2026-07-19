const MAX_QUERY_LENGTH = 160;

function getQuery(value) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_QUERY_LENGTH) : '';
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  const query = getQuery(request.query.q);
  if (query.length < 3) return response.status(400).json({ error: 'Enter at least 3 characters to search.' });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return response.status(503).json({ error: 'Location search is not configured yet.' });

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', query);
    url.searchParams.set('components', 'country:IN');
    url.searchParams.set('region', 'in');
    url.searchParams.set('key', key);
    const googleResponse = await fetch(url);
    if (!googleResponse.ok) throw new Error(`Google API returned ${googleResponse.status}`);
    const payload = await googleResponse.json();
    if (payload.status !== 'OK' || !payload.results?.length) return response.status(404).json({ error: 'No matching location was found in India.' });

    const results = payload.results.slice(0, 5).map(result => ({
      label: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      precision: result.geometry.location_type
    }));
    response.setHeader('Cache-Control', 'private, max-age=300');
    return response.status(200).json({ results });
  } catch (error) {
    console.error('Location search failed', error.message);
    return response.status(502).json({ error: 'Location search is temporarily unavailable.' });
  }
}

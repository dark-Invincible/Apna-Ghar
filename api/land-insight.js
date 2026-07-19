const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;
const SAMPLE_OFFSET_DEGREES = 0.00027;

function coordinate(value, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= maximum ? number : null;
}

function buildSamples(latitude, longitude) {
  return [
    [latitude, longitude],
    [latitude + SAMPLE_OFFSET_DEGREES, longitude],
    [latitude - SAMPLE_OFFSET_DEGREES, longitude],
    [latitude, longitude + SAMPLE_OFFSET_DEGREES],
    [latitude, longitude - SAMPLE_OFFSET_DEGREES]
  ];
}

function classifyTerrain(elevations) {
  const centre = elevations[0];
  const range = Math.max(...elevations) - Math.min(...elevations);
  const estimatedSlope = Math.atan(range / 30) * (180 / Math.PI);
  const slope = Math.round(estimatedSlope * 10) / 10;
  const score = Math.max(45, Math.min(95, Math.round(94 - slope * 3.2)));
  const drainage = slope < 1.2 ? 'Review required' : slope < 5 ? 'Moderate' : 'Priority review';
  const title = slope < 2.5 ? 'Mostly level' : slope < 5 ? 'Gentle slope' : 'Noticeable slope';
  return { elevation: Math.round(centre), slope, score, drainage, title, sampleRange: Math.round(range * 10) / 10 };
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  const latitude = coordinate(request.query.lat, MAX_LATITUDE);
  const longitude = coordinate(request.query.lng, MAX_LONGITUDE);
  if (latitude === null || longitude === null) return response.status(400).json({ error: 'Valid latitude and longitude are required.' });

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return response.status(503).json({ error: 'Terrain service is not configured yet.' });

  try {
    const samples = buildSamples(latitude, longitude);
    const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
    url.searchParams.set('locations', samples.map(([lat, lng]) => `${lat},${lng}`).join('|'));
    url.searchParams.set('key', key);
    const googleResponse = await fetch(url);
    if (!googleResponse.ok) throw new Error(`Google API returned ${googleResponse.status}`);
    const payload = await googleResponse.json();
    if (payload.status !== 'OK' || payload.results?.length !== samples.length) throw new Error(`Elevation result was ${payload.status}`);
    const terrain = classifyTerrain(payload.results.map(result => result.elevation));
    response.setHeader('Cache-Control', 'private, max-age=300');
    return response.status(200).json({ latitude, longitude, ...terrain, source: 'Google Elevation API', generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Terrain insight failed', error.message);
    return response.status(502).json({ error: 'Terrain service is temporarily unavailable.' });
  }
}

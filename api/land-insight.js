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

  try {
    const samples = buildSamples(latitude, longitude);
    
    // Construct the Open-Meteo elevation request URL
    const url = new URL('https://api.open-meteo.com/v1/elevation');
    const latitudes = samples.map(([lat, lng]) => lat).join(',');
    const longitudes = samples.map(([lat, lng]) => lng).join(',');
    url.searchParams.set('latitude', latitudes);
    url.searchParams.set('longitude', longitudes);

    const openMeteoResponse = await fetch(url);
    if (!openMeteoResponse.ok) throw new Error(`Open-Meteo API returned ${openMeteoResponse.status}`);
    
    const payload = await openMeteoResponse.json();
    if (!payload.elevation || payload.elevation.length !== samples.length) {
      throw new Error('Elevation results are incomplete');
    }
    
    const elevations = payload.elevation;
    const terrain = classifyTerrain(elevations);
    
    response.setHeader('Cache-Control', 'private, max-age=300');
    return response.status(200).json({
      latitude,
      longitude,
      ...terrain,
      source: 'Open-Meteo Elevation API',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Terrain insight failed:', error.message);
    return response.status(502).json({ error: 'Terrain service is temporarily unavailable.' });
  }
}

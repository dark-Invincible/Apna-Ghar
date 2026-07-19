export default function handler(request, response) {
  response.status(200).json({ status: 'ok', service: 'apna-ghar-api', timestamp: new Date().toISOString() });
}

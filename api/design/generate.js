// Ephemeral memory cache for active generation tasks
// Since it's serverless, we'll store tasks in global scope, which survives across warm invocations.
export const activeTasks = global.activeTasks || {};
if (!global.activeTasks) {
  global.activeTasks = activeTasks;
}

export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const data = request.method === 'POST' ? request.body : request.query;
  const prompt = data.prompt || 'Modern sustainable house';
  const width = parseFloat(data.width) || 40;
  const length = parseFloat(data.length) || 60;
  const height = parseFloat(data.height) || 20;

  const taskId = 'task_' + Math.random().toString(36).substring(2, 11);
  
  // Set initial status: starts at 0%
  activeTasks[taskId] = {
    taskId,
    prompt,
    dimensions: { width, length, height },
    progress: 0,
    status: 'preprocessing',
    startedAt: Date.now()
  };

  return response.status(200).json({
    success: true,
    taskId,
    message: '3D Generation task started successfully',
    pollUrl: `/api/design/status?taskId=${taskId}`
  });
}

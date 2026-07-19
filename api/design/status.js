import { activeTasks } from './generate.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId } = request.query;

  if (!taskId) {
    return response.status(400).json({ error: 'taskId query parameter is required.' });
  }

  // Retrieve task from in-memory global cache
  const tasks = global.activeTasks || {};
  let task = tasks[taskId];

  // If task doesn't exist (e.g. server restarted or mock fallback), create a dynamic task
  if (!task) {
    task = {
      taskId,
      prompt: 'Dynamic Fallback Modern Home',
      dimensions: { width: 30, length: 50, height: 18 },
      progress: 0,
      status: 'preprocessing',
      startedAt: Date.now()
    };
    tasks[taskId] = task;
  }

  // Increment progress on every poll
  if (task.progress < 100) {
    task.progress += 25;
    if (task.progress === 25) {
      task.status = 'preprocessing';
    } else if (task.progress === 50) {
      task.status = 'background_removal';
    } else if (task.progress === 75) {
      task.status = 'mesh_generation';
    } else if (task.progress >= 100) {
      task.progress = 100;
      task.status = 'completed';
    }
  }

  const responsePayload = {
    taskId: task.taskId,
    progress: task.progress,
    status: task.status,
    prompt: task.prompt
  };

  if (task.status === 'completed') {
    // Return final 3D design configurations
    responsePayload.modelData = {
      dimensions: task.dimensions,
      roofType: task.prompt.toLowerCase().includes('slope') || task.prompt.toLowerCase().includes('villa') ? 'gabled' : 'flat',
      color: task.prompt.toLowerCase().includes('dark') ? '#2e3a35' : '#eae5d8',
      materials: {
        concrete: 45, // percentage breakdown
        glass: 25,
        steel: 15,
        brick: 15
      },
      stories: task.dimensions.height > 12 ? 2 : 1
    };
  }

  return response.status(200).json(responsePayload);
}

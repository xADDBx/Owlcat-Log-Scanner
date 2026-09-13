import { scanLog } from './core/scan';
import type { WorkerRequest, WorkerResponse } from './core/types';
import { getGame } from './games';

function send(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type !== 'scan') return;
  try {
    const { file, gameId } = event.data;
    const report = await scanLog(file, file.name, getGame(gameId), (progress) => {
      send({ type: 'progress', progress });
    });
    send({ type: 'complete', report });
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Could not read the file. Try choosing it again.',
    });
  }
};

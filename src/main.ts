import './style.css';
import type { ScanProgress, WorkerRequest, WorkerResponse } from './core/types';
import { getGame } from './games';
import { element, formatBytes, renderReport, setExternalLink } from './report';

function query<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing UI element: ${selector}`);
  return node;
}

const game = getGame(document.body.dataset.game ?? '');
const input = query<HTMLInputElement>('#file-input');
const choose = query<HTMLButtonElement>('#choose-file');
const drop = query('#drop-zone');
const progressPanel = query('#scan-progress');
const progressBar = query<HTMLProgressElement>('#progress-bar');
const status = query('#status');
const error = query('#error');
const results = query('#results');
let worker: Worker | null = null;

const platform = query<HTMLSelectElement>('#log-platform');
for (const [index, directory] of game.logDirectories.entries()) {
  const option = element('option', directory.label);
  option.value = String(index);
  platform.append(option);
}
function updateLogPath(): void {
  const directory = game.logDirectories[Number(platform.value)]!;
  query('#log-path').textContent = directory.path;
  query('#log-path-hint').textContent = directory.hint;
  query('#copy-status').textContent = '';
}
platform.addEventListener('change', updateLogPath);
updateLogPath();
query('#catalog-notice').hidden = game.detections.length > 0;
const support = query<HTMLAnchorElement>('#support-link');
support.textContent = game.support.label;
if (game.support.url) setExternalLink(support, game.support.url);

query('#copy-path').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(game.logDirectories[Number(platform.value)]!.path);
    query('#copy-status').textContent = 'Folder path copied.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(query('#log-path'));
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    query('#copy-status').textContent = 'Automatic copy is unavailable. Copy the selected path manually.';
  }
});

function setBusy(busy: boolean): void {
  choose.disabled = busy;
  progressPanel.hidden = !busy;
  drop.classList.toggle('busy', busy);
  drop.setAttribute('aria-busy', String(busy));
}

function stopWorker(): void {
  worker?.terminate();
  worker = null;
  setBusy(false);
}

function fail(message: string): void {
  stopWorker();
  results.hidden = true;
  status.textContent = '';
  error.textContent = message;
  error.hidden = false;
}

function updateProgress(progress: ScanProgress): void {
  const percent = progress.totalBytes ? Math.floor(progress.bytesRead / progress.totalBytes * 100) : 0;
  progressBar.value = percent;
  query('#progress-label').textContent = `Reading log… ${percent}%`;
  query('#progress-detail').textContent = `${formatBytes(progress.bytesRead)} of ${formatBytes(progress.totalBytes)} · ${progress.linesRead.toLocaleString()} lines`;
}

function startScan(files: FileList | File[]): void {
  if (worker) return;
  if (!files.length) return;
  if (files.length !== 1) {
    fail('Choose one log at a time. You can scan another file when the first is finished.');
    return;
  }
  const file = files[0]!;
  error.hidden = true;
  results.hidden = true;
  query('#report-summary').replaceChildren();
  query('#findings').replaceChildren();
  status.textContent = '';
  query('#active-file').textContent = file.name;
  updateProgress({ bytesRead: 0, totalBytes: file.size, linesRead: 0 });
  setBusy(true);
  try {
    const current = new Worker(new URL('./scan.worker.ts', import.meta.url), { type: 'module' });
    worker = current;
    current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (worker !== current) return;
      const response = event.data;
      if (response.type === 'progress') {
        updateProgress(response.progress);
      } else if (response.type === 'complete') {
        stopWorker();
        renderReport(query('#report-summary'), query('#findings'), response.report, game);
        results.hidden = false;
        status.textContent = 'Scan complete.';
        query('#results-heading').focus({ preventScroll: true });
        query('#results-heading').scrollIntoView({ block: 'nearest' });
      } else {
        fail(response.message);
      }
    };
    current.onerror = (event) => {
      event.preventDefault();
      if (worker === current) fail('The scanner stopped unexpectedly. Try again or ask for help on Discord.');
    };
    current.onmessageerror = () => {
      if (worker === current) fail('Could not receive the scan result. Try choosing the file again.');
    };
    const request: WorkerRequest = { type: 'scan', gameId: game.id, file };
    current.postMessage(request);
  } catch {
    fail('Could not start the background scanner. Try a current version of Firefox, Chrome, Edge, or Safari.');
  }
}

choose.addEventListener('click', () => input.click());
input.addEventListener('change', () => {
  if (input.files) startScan(input.files);
  input.value = '';
});
query('#cancel').addEventListener('click', () => {
  stopWorker();
  status.textContent = 'Scan cancelled. Choose a file to try again.';
  choose.focus();
});
window.addEventListener('pagehide', stopWorker);

// Prevent dropped logs from navigating the tab, including drops outside the box.
for (const name of ['dragover', 'drop']) {
  window.addEventListener(name, (event) => {
    const drag = event as DragEvent;
    if (drag.dataTransfer?.types.includes('Files')) drag.preventDefault();
  });
}
drop.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = worker ? 'none' : 'copy';
  if (!worker) drop.classList.add('dragging');
});
drop.addEventListener('dragleave', (event) => {
  if (!(event.relatedTarget instanceof Node) || !drop.contains(event.relatedTarget)) drop.classList.remove('dragging');
});
drop.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('dragging');
  if (event.dataTransfer) startScan(event.dataTransfer.files);
});

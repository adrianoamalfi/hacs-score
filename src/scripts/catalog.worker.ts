import { filterRows, sortRows, type CatalogItem, type CatalogState } from './catalog-core';

type InitMessage = { type: 'init'; items: CatalogItem[] };
type QueryMessage = { type: 'query'; state: CatalogState; visibleLimit: number; now: number; requestId: number };
type WorkerMessage = InitMessage | QueryMessage;

let items: CatalogItem[] = [];

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'init') {
    items = message.items;
    return;
  }

  const filtered = sortRows(filterRows(items, message.state, message.now), message.state.sort);
  const visible = filtered.slice(0, message.visibleLimit);

  self.postMessage({
    type: 'result',
    requestId: message.requestId,
    total: filtered.length,
    visible
  });
});

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'src', 'data', 'hacs');

const endpoints = [
  {
    name: 'integration-data',
    url: 'https://data-v2.hacs.xyz/integration/data.json',
    expected: 'object',
    file: 'integration-data.json'
  },
  {
    name: 'integration-repositories',
    url: 'https://data-v2.hacs.xyz/integration/repositories.json',
    expected: 'array',
    file: 'integration-repositories.json'
  }
];

const timeoutMs = Number(process.env.HACS_FETCH_TIMEOUT_MS || 20000);
const strictMode = process.env.HACS_FETCH_STRICT === 'true' || process.env.CI === 'true';

function validateType(name, payload, expected) {
  if (expected === 'array' && !Array.isArray(payload)) {
    throw new Error(`${name}: expected an array but received ${typeof payload}`);
  }

  if (expected === 'object' && (payload === null || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new Error(`${name}: expected an object but received ${Array.isArray(payload) ? 'array' : typeof payload}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status} ${response.statusText})`);
  }

  return response.json();
}

async function run() {
  await mkdir(outDir, { recursive: true });

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const payload = await fetchJson(endpoint.url);
      validateType(endpoint.name, payload, endpoint.expected);

      const outPath = path.join(outDir, endpoint.file);
      await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      results.push({ name: endpoint.name, ok: true, file: outPath });
      console.log(`[sync:hacs] saved ${endpoint.name} -> ${outPath}`);
    } catch (error) {
      results.push({ name: endpoint.name, ok: false, error: error.message });
      console.error(`[sync:hacs] failed ${endpoint.name}: ${error.message}`);
    }
  }

  const allOk = results.every((item) => item.ok);
  const summaryPath = path.join(outDir, 'last-sync.json');
  const summary = {
    generatedAt: new Date().toISOString(),
    strictMode,
    timeoutMs,
    results
  };

  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`[sync:hacs] summary -> ${summaryPath}`);

  if (!allOk && strictMode) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`[sync:hacs] unexpected error: ${error.message}`);
  process.exit(1);
});

import { deflateSync } from 'node:zlib';

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

const BYTES_PER_PIXEL = 4;
const FONT_WIDTH = 5;
const FONT_HEIGHT = 7;

type ImageBuffer = Uint8Array;

type DrawTextOptions = {
  size?: number;
  color?: [number, number, number, number];
  maxWidth?: number;
  lineHeight?: number;
  maxLines?: number;
};

const FONT: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b10000, 0b11110, 0b00001, 0b00001, 0b11110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  '.': [0, 0, 0, 0, 0, 0b00110, 0b00110],
  ',': [0, 0, 0, 0, 0, 0b00110, 0b00100],
  ':': [0, 0b00110, 0b00110, 0, 0b00110, 0b00110, 0],
  '-': [0, 0, 0, 0b11111, 0, 0, 0],
  '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0, 0],
  '#': [0b01010, 0b11111, 0b01010, 0b01010, 0b11111, 0b01010, 0b01010],
  '+': [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  '%': [0b11001, 0b11010, 0b00100, 0b01000, 0b10110, 0b00110, 0],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '&': [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  '?': [0b01110, 0b10001, 0b00010, 0b00100, 0b00100, 0, 0b00100],
  '_': [0, 0, 0, 0, 0, 0, 0b11111],
  '=': [0, 0b11111, 0, 0b11111, 0, 0, 0]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createCanvas(width: number, height: number): ImageBuffer {
  return new Uint8Array(width * height * BYTES_PER_PIXEL);
}

function setPixel(canvas: ImageBuffer, width: number, x: number, y: number, rgba: [number, number, number, number]): void {
  if (x < 0 || y < 0) return;
  if (x >= width) return;
  const height = canvas.length / BYTES_PER_PIXEL / width;
  if (y >= height) return;

  const index = (y * width + x) * BYTES_PER_PIXEL;
  canvas[index] = rgba[0];
  canvas[index + 1] = rgba[1];
  canvas[index + 2] = rgba[2];
  canvas[index + 3] = rgba[3];
}

function fillRect(
  canvas: ImageBuffer,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rgba: [number, number, number, number]
): void {
  const height = canvas.length / BYTES_PER_PIXEL / width;
  const startX = clamp(Math.floor(x), 0, width);
  const endX = clamp(Math.ceil(x + w), 0, width);
  const startY = clamp(Math.floor(y), 0, height);
  const endY = clamp(Math.ceil(y + h), 0, height);

  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      setPixel(canvas, width, px, py, rgba);
    }
  }
}

function fillBackgroundGradient(canvas: ImageBuffer, width: number, height: number): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / (width - 1);
      const ny = y / (height - 1);
      const r = Math.round(16 + 20 * nx + 30 * ny);
      const g = Math.round(33 + 40 * nx + 10 * ny);
      const b = Math.round(50 + 50 * (1 - nx) + 20 * ny);
      setPixel(canvas, width, x, y, [r, g, b, 255]);
    }
  }

  fillRect(canvas, width, -140, -120, 700, 420, [18, 76, 120, 110]);
  fillRect(canvas, width, 740, 140, 560, 440, [76, 31, 106, 95]);
}

function normalizeText(input: string): string {
  return input.toUpperCase().replace(/\s+/g, ' ').trim();
}

function drawGlyph(
  canvas: ImageBuffer,
  width: number,
  x: number,
  y: number,
  glyph: number[],
  scale: number,
  color: [number, number, number, number]
): void {
  for (let row = 0; row < FONT_HEIGHT; row += 1) {
    const mask = glyph[row] ?? 0;
    for (let col = 0; col < FONT_WIDTH; col += 1) {
      const bit = (mask >> (FONT_WIDTH - 1 - col)) & 1;
      if (!bit) continue;
      fillRect(canvas, width, x + col * scale, y + row * scale, scale, scale, color);
    }
  }
}

function measureText(text: string, scale: number): number {
  const glyphWidth = FONT_WIDTH * scale;
  const letterSpacing = scale;
  return text.length * glyphWidth + Math.max(0, text.length - 1) * letterSpacing;
}

function wrapLines(text: string, maxWidth: number, scale: number): string[] {
  const words = normalizeText(text).split(' ').filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, scale) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let sliced = '';
    for (const char of word) {
      const test = `${sliced}${char}`;
      if (measureText(test, scale) > maxWidth) break;
      sliced = test;
    }

    lines.push(sliced || word.slice(0, 1));
    current = word.slice((sliced || word.slice(0, 1)).length);
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function drawText(
  canvas: ImageBuffer,
  width: number,
  x: number,
  y: number,
  text: string,
  options: DrawTextOptions = {}
): { linesUsed: number; endY: number } {
  const scale = options.size ?? 4;
  const color = options.color ?? [232, 241, 255, 255];
  const maxWidth = options.maxWidth ?? width - x;
  const lineHeight = options.lineHeight ?? FONT_HEIGHT * scale + scale * 2;
  const maxLines = options.maxLines ?? Number.POSITIVE_INFINITY;

  const lines = wrapLines(text, maxWidth, scale);
  const visibleLines = lines.slice(0, maxLines);
  let cursorY = y;

  for (const line of visibleLines) {
    let cursorX = x;
    for (const rawChar of normalizeText(line)) {
      const glyph = FONT[rawChar] || FONT['?'];
      drawGlyph(canvas, width, cursorX, cursorY, glyph, scale, color);
      cursorX += FONT_WIDTH * scale + scale;
    }
    cursorY += lineHeight;
  }

  return { linesUsed: visibleLines.length, endY: cursorY };
}

function writeUInt32BE(value: number): Uint8Array {
  const output = new Uint8Array(4);
  output[0] = (value >>> 24) & 0xff;
  output[1] = (value >>> 16) & 0xff;
  output[2] = (value >>> 8) & 0xff;
  output[3] = value & 0xff;
  return output;
}

function crc32(input: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(4 + 4 + data.length + 4);

  chunk.set(writeUInt32BE(data.length), 0);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  chunk.set(writeUInt32BE(crc32(crcInput)), 8 + data.length);

  return chunk;
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((acc, item) => acc + item.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const buffer of buffers) {
    output.set(buffer, offset);
    offset += buffer.length;
  }

  return output;
}

function encodePngRgba(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const rowSize = width * BYTES_PER_PIXEL;
  const raw = new Uint8Array((rowSize + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const inputStart = y * rowSize;
    const outputStart = y * (rowSize + 1);
    raw[outputStart] = 0;
    raw.set(rgba.subarray(inputStart, inputStart + rowSize), outputStart + 1);
  }

  const compressed = deflateSync(raw, { level: 9 });

  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  ihdr.set(writeUInt32BE(width), 0);
  ihdr.set(writeUInt32BE(height), 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return concatBuffers([
    pngSignature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', new Uint8Array(0))
  ]);
}

function drawPanel(canvas: ImageBuffer, width: number): void {
  fillRect(canvas, width, 56, 50, 1088, 530, [7, 19, 35, 220]);
  fillRect(canvas, width, 56, 50, 1088, 8, [53, 182, 255, 255]);
  fillRect(canvas, width, 56, 572, 1088, 8, [88, 227, 194, 255]);
}

function metricTile(canvas: ImageBuffer, width: number, x: number, y: number, label: string, value: string): void {
  fillRect(canvas, width, x, y, 250, 120, [11, 29, 52, 220]);
  fillRect(canvas, width, x, y, 250, 3, [86, 208, 255, 255]);
  drawText(canvas, width, x + 16, y + 18, label, { size: 2, color: [141, 176, 212, 255], maxWidth: 214, maxLines: 1 });
  drawText(canvas, width, x + 16, y + 52, value, { size: 4, color: [230, 243, 255, 255], maxWidth: 214, maxLines: 1 });
}

export type HomeImageInput = {
  totalIntegrations: number;
  topCohortCount: number;
  syncedAtLabel: string;
};

export function renderHomeImagePng(input: HomeImageInput): Uint8Array {
  const canvas = createCanvas(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
  fillBackgroundGradient(canvas, SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
  drawPanel(canvas, SOCIAL_IMAGE_WIDTH);

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 102, 'HACS SCOREBOARD', {
    size: 3,
    color: [120, 219, 255, 255],
    maxWidth: 700,
    maxLines: 1
  });

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 170, 'RANK HOME ASSISTANT INTEGRATIONS WITH ONE KPI', {
    size: 4,
    color: [230, 243, 255, 255],
    maxWidth: 940,
    maxLines: 2
  });

  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 98, 356, 'INTEGRATIONS', input.totalIntegrations.toLocaleString('en-US'));
  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 370, 356, 'TOP COHORT', input.topCohortCount.toLocaleString('en-US'));

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 530, `SYNCED ${input.syncedAtLabel}`, {
    size: 2,
    color: [168, 197, 227, 255],
    maxWidth: 1000,
    maxLines: 1
  });

  return encodePngRgba(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT, canvas);
}

export type IntegrationImageInput = {
  name: string;
  repo: string;
  category: string;
  score: number;
  confidence: number;
  stars: number;
  rank: number;
  total: number;
  updatedLabel: string;
};

export function renderIntegrationImagePng(input: IntegrationImageInput): Uint8Array {
  const canvas = createCanvas(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
  fillBackgroundGradient(canvas, SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT);
  drawPanel(canvas, SOCIAL_IMAGE_WIDTH);

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 100, 'HACS SCORE PROFILE', {
    size: 3,
    color: [120, 219, 255, 255],
    maxWidth: 520,
    maxLines: 1
  });

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 160, input.name, {
    size: 5,
    color: [236, 247, 255, 255],
    maxWidth: 820,
    maxLines: 2
  });

  drawText(canvas, SOCIAL_IMAGE_WIDTH, 98, 272, `${input.repo} / ${input.category}`, {
    size: 3,
    color: [168, 197, 227, 255],
    maxWidth: 840,
    maxLines: 1
  });

  fillRect(canvas, SOCIAL_IMAGE_WIDTH, 930, 100, 180, 180, [10, 34, 60, 220]);
  fillRect(canvas, SOCIAL_IMAGE_WIDTH, 930, 100, 180, 5, [86, 208, 255, 255]);
  drawText(canvas, SOCIAL_IMAGE_WIDTH, 960, 128, 'SCORE', {
    size: 2,
    color: [141, 176, 212, 255],
    maxWidth: 120,
    maxLines: 1
  });
  drawText(canvas, SOCIAL_IMAGE_WIDTH, 964, 170, String(input.score), {
    size: 6,
    color: [230, 243, 255, 255],
    maxWidth: 120,
    maxLines: 1
  });

  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 98, 356, 'RANK', `#${input.rank}/${input.total}`);
  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 370, 356, 'CONFIDENCE', `${input.confidence}%`);
  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 642, 356, 'STARS', input.stars.toLocaleString('en-US'));
  metricTile(canvas, SOCIAL_IMAGE_WIDTH, 914, 356, 'UPDATED', input.updatedLabel);

  return encodePngRgba(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT, canvas);
}

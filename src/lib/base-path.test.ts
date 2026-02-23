import { describe, expect, it } from 'vitest';
import { normalizeBasePath, withBasePath } from './base-path';

describe('base path helpers', () => {
  it('normalizes base path with leading and trailing slash', () => {
    expect(normalizeBasePath('repo')).toBe('/repo/');
    expect(normalizeBasePath('/repo')).toBe('/repo/');
    expect(normalizeBasePath('/')).toBe('/');
  });

  it('builds rooted paths with base path', () => {
    expect(withBasePath('integration/a--b/', '/')).toBe('/integration/a--b/');
    expect(withBasePath('integration/a--b/', '/showcase/')).toBe('/showcase/integration/a--b/');
  });

  it('keeps absolute urls untouched', () => {
    expect(withBasePath('https://example.com/x', '/showcase/')).toBe('https://example.com/x');
  });
});

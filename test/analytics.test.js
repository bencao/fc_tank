import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Vercel Web Analytics', () => {
  it('loads the insights script from index.html', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<script defer src="/_vercel/insights/script.js"></script>');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Vercel Web Analytics', () => {
  it('loads the insights script from index.html', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<script defer src="/_vercel/insights/script.js"></script>');
  });
});

describe('Vercel Web Analytics privacy', () => {
  it('strips the query and fragment before the script loads', () => {
    const html = readFileSync('index.html', 'utf8');
    const hook = html.indexOf('window.va("beforeSend"');
    expect(hook).toBeGreaterThan(-1);
    expect(hook).toBeLessThan(html.indexOf('/_vercel/insights/script.js'));
  });
});

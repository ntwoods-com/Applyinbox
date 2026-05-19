import { describe, expect, it } from 'vitest';
import { buildCareersCsp } from './csp.mjs';

describe('buildCareersCsp', () => {
  it('uses exact production hosts only', () => {
    const csp = buildCareersCsp({
      apiBase: 'https://ntwoods.onrender.com/api',
      isDev: false,
    });

    expect(csp).toContain('https://ntwoods.onrender.com');
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).not.toContain('http://localhost:*');
    expect(csp).not.toContain('ws://localhost:*');
    expect(csp).not.toMatch(/connect-src 'self' https:(?:;| )/);
  });
});

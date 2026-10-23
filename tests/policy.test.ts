import { describe, expect, it } from 'vitest';
import { showsSubscriptionNote } from '../server/api.ts';
import { createPortfolioCapability } from '../server/capability.ts';
import { assertUsername } from '../server/paths.ts';

describe('portfolio policy', () => {
  it('limits the capability to the data folder and write-like tools', () => {
    const capability = createPortfolioCapability('/tmp/folio-data');
    expect(capability.id).toBe('portfolio');
    expect(capability.writableRoots).toEqual(['/tmp/folio-data']);
    expect(capability.allowedTools).toContain('write');
    expect(capability.allowedTools).toContain('Read');
    expect(capability.allowedTools).not.toContain('Bash');
    expect(capability.allowedTools).not.toContain('shell');
    expect(capability.systemPromptAppend).toContain('site path');
    expect(capability.systemPromptAppend).toContain('elicitation');
  });

  it('rejects a username that could escape the cache directory', () => {
    expect(() => assertUsername('../secret')).toThrow();
    expect(() => assertUsername('Jacky97s/../../etc')).toThrow();
    expect(assertUsername('Jacky97s')).toBe('Jacky97s');
  });

  it('shows the subscription note only for Claude Code and Codex', () => {
    expect(showsSubscriptionNote('mock')).toBe(false);
    expect(showsSubscriptionNote('claude-code')).toBe(true);
    expect(showsSubscriptionNote('codex')).toBe(true);
  });
});

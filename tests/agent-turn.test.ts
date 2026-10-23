import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAgentServer } from '@agent-panel/server';
import { afterEach, describe, expect, it } from 'vitest';
import { draftSite } from '../shared/draft.ts';
import type { GithubCache, Site } from '../shared/types.ts';
import { createPortfolioCapability } from '../server/capability.ts';
import { createPortfolioAgent } from '../server/mock-portfolio-agent.ts';

const dirs: string[] = [];
const cache = JSON.parse(
  await readFile(path.join(process.cwd(), 'data/github/Jacky97s.json'), 'utf8'),
) as GithubCache;

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('portfolio mock agent', () => {
  it('rewrites only the about section after the write is allowed', async () => {
    const site = draftSite(cache, {
      tone: 'professional',
      language: 'zh-Hant',
      featured: ['agent-panel', 'pytest-synapse', 'gbp-seo-portfolio'],
    });
    const { base, root, close } = await start(site);
    try {
      const events = await openEvents(base);
      const created = await session(base);
      const posted = await send(base, created.id, '這段寫得更像 SDET 主管', {
        section: 'about',
        username: 'Jacky97s',
        file: 'data/site.json',
        selection: site.about.body,
      });
      expect(posted).toBe(202);
      const permission = await waitFor(events, (event) => event.type === 'permission');
      expect(await respond(base, created.id, { requestId: permission.requestId, kind: 'permission', optionId: 'allow' })).toBe(200);
      await waitFor(events, (event) => event.type === 'result');
      const next = JSON.parse(await readFile(path.join(root, 'site.json'), 'utf8')) as Site;
      expect(next.about.body).toContain('我帶 SDET 團隊');
      expect(next.hero).toEqual(site.hero);
      expect(next.projects).toEqual(site.projects);
    } finally {
      await close();
    }
  });

  it('asks with a question card, then writes the chosen repositories', async () => {
    const site = draftSite(cache, {
      tone: 'professional',
      language: 'zh-Hant',
      featured: ['agent-panel', 'pytest-synapse'],
    });
    const { base, root, close } = await start(site);
    try {
      const events = await openEvents(base);
      const created = await session(base);
      expect(
        await send(base, created.id, '幫我用 Jacky97s 生一個作品集', {
          username: 'Jacky97s',
          file: 'data/site.json',
          section: '',
        }),
      ).toBe(202);
      const question = await waitFor(events, (event) => event.type === 'question');
      expect(question.message).toContain('語氣');
      expect(await respond(base, created.id, {
        requestId: question.requestId,
        kind: 'question',
        action: 'accept',
        content: {
          tone: 'warm',
          language: 'en',
          featured: 'agent-panel,shutup-bot,iherb-deal',
        },
      })).toBe(200);
      const permission = await waitFor(events, (event) => event.type === 'permission');
      expect(await respond(base, created.id, { requestId: permission.requestId, kind: 'permission', optionId: 'allow' })).toBe(200);
      await waitFor(events, (event) => event.type === 'result');
      const next = JSON.parse(await readFile(path.join(root, 'site.json'), 'utf8')) as Site;
      expect(next.language).toBe('en');
      expect(next.projects.items.map((item) => item.repo)).toEqual(['agent-panel', 'shutup-bot', 'iherb-deal']);
    } finally {
      await close();
    }
  });
});

async function start(site: Site) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'folio-'));
  dirs.push(cwd);
  const root = path.join(cwd, 'data');
  await mkdir(path.join(root, 'github'), { recursive: true });
  await writeFile(path.join(root, 'site.json'), `${JSON.stringify(site, null, 2)}\n`);
  await writeFile(path.join(root, 'github', 'Jacky97s.json'), `${JSON.stringify(cache, null, 2)}\n`);
  const agent = createAgentServer({
    cwd,
    writableRoots: [root],
    capabilities: [createPortfolioCapability(root)],
    agent: { app: createPortfolioAgent() },
  });
  const http = createServer((req, res) => {
    void agent.handle(req, res);
  });
  agent.attach(http);
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as AddressInfo).port;
  return {
    root,
    base: `http://127.0.0.1:${port}/__agent`,
    close: async () => {
      await agent.close();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}

type Wire = { type: string; requestId?: string; message?: string; stopReason?: string };

async function openEvents(base: string): Promise<Wire[]> {
  const events: Wire[] = [];
  const socket = new WebSocket(base.replace('http', 'ws') + '/ws');
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error('socket failed')));
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data)) as Wire & { events?: Wire[] };
    if (message.type === 'hello') return;
    events.push(message);
  });
  return events;
}

async function session(base: string): Promise<{ id: string }> {
  const response = await fetch(`${base}/sessions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ capabilityId: 'portfolio' }),
  });
  expect(response.ok).toBe(true);
  return (await response.json()) as { id: string };
}

async function send(base: string, id: string, text: string, context: Record<string, string>): Promise<number> {
  const response = await fetch(`${base}/sessions/${id}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, capabilityId: 'portfolio', context }),
  });
  return response.status;
}

async function respond(base: string, id: string, body: Record<string, unknown>): Promise<number> {
  const response = await fetch(`${base}/sessions/${id}/respond`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.status;
}

function waitFor(events: Wire[], predicate: (event: Wire) => boolean): Promise<Wire> {
  const found = events.find(predicate);
  if (found) return Promise.resolve(found);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const next = events.find(predicate);
      if (next) {
        clearInterval(timer);
        resolve(next);
        return;
      }
      if (Date.now() - started > 8_000) {
        clearInterval(timer);
        reject(new Error(`timed out; events=${JSON.stringify(events)}`));
      }
    }, 20);
  });
}

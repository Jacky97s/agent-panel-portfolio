import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { renderSiteHtml } from '../shared/render.ts';
import { parseSite } from '../shared/site.ts';
import { isTheme, type Site } from '../shared/types.ts';
import { fetchAndCache, readCache } from './github.ts';
import { agentModePath, distDir, sitePath } from './paths.ts';

export type AgentMode = 'mock' | 'claude-code' | 'codex';

const MODES: AgentMode[] = ['mock', 'claude-code', 'codex'];

export function isAgentMode(value: string): value is AgentMode {
  return (MODES as string[]).includes(value);
}

export async function readAgentMode(root: string): Promise<AgentMode> {
  try {
    const parsed = JSON.parse(await fs.readFile(agentModePath(root), 'utf8')) as { agent?: string };
    if (parsed.agent && isAgentMode(parsed.agent)) return parsed.agent;
  } catch {
    // Missing file means the deterministic demo peer.
  }
  return 'mock';
}

export function showsSubscriptionNote(mode: AgentMode): boolean {
  return mode === 'claude-code' || mode === 'codex';
}

export function createApi(options: {
  root: string;
  onAgentChange?: (mode: AgentMode) => void;
}): (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void {
  return (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    if (!url.pathname.startsWith('/api/')) {
      next();
      return;
    }
    void handle(options.root, url, req, res, options.onAgentChange).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      json(res, 500, { error: message });
    });
  };
}

async function handle(
  root: string,
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
  onAgentChange?: (mode: AgentMode) => void,
) {
  const method = req.method ?? 'GET';
  if (url.pathname === '/api/site' && method === 'GET') {
    const payload = await readSite(root);
    json(res, 200, payload);
    return;
  }
  if (url.pathname === '/api/site' && method === 'PUT') {
    const body = await readBody(req);
    const theme = typeof body.theme === 'string' ? body.theme : '';
    if (!isTheme(theme)) {
      json(res, 400, { error: '未知的主題' });
      return;
    }
    const current = await readSite(root);
    if (!current.site) {
      json(res, 409, { error: current.error ?? '還沒有作品集' });
      return;
    }
    const next = { ...current.site, theme };
    await fs.writeFile(sitePath(root), `${JSON.stringify(next, null, 2)}\n`);
    json(res, 200, { site: next });
    return;
  }
  if (url.pathname === '/api/github' && method === 'GET') {
    const username = url.searchParams.get('username') ?? '';
    try {
      const cache = username ? await readCache(root, username) : null;
      json(res, 200, { cached: Boolean(cache), fetchedAt: cache?.fetchedAt ?? null, user: cache?.user ?? null });
    } catch (error) {
      json(res, 200, {
        cached: false,
        fetchedAt: null,
        user: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  if (url.pathname === '/api/github' && method === 'POST') {
    const body = await readBody(req);
    const username = typeof body.username === 'string' ? body.username : '';
    const cache = await fetchAndCache(root, username);
    json(res, 200, { cached: true, fetchedAt: cache.fetchedAt, user: cache.user, repos: cache.repos.length });
    return;
  }
  if (url.pathname === '/api/export' && method === 'POST') {
    const current = await readSite(root);
    if (!current.site) {
      json(res, 409, { error: current.error ?? '還沒有作品集' });
      return;
    }
    const html = renderSiteHtml(current.site, { interactive: false });
    const folder = distDir();
    await fs.mkdir(folder, { recursive: true });
    const file = path.join(folder, 'index.html');
    await fs.writeFile(file, html);
    json(res, 200, { path: 'dist-site/index.html', bytes: Buffer.byteLength(html) });
    return;
  }
  if (url.pathname === '/api/agent' && method === 'GET') {
    const agent = await readAgentMode(root);
    json(res, 200, { agent, subscription: showsSubscriptionNote(agent) });
    return;
  }
  if (url.pathname === '/api/agent' && method === 'POST') {
    const body = await readBody(req);
    const agent = typeof body.agent === 'string' ? body.agent : '';
    if (!isAgentMode(agent)) {
      json(res, 400, { error: '未知的代理' });
      return;
    }
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(agentModePath(root), `${JSON.stringify({ agent }, null, 2)}\n`);
    json(res, 200, { agent, subscription: showsSubscriptionNote(agent), restarting: true });
    onAgentChange?.(agent);
    return;
  }
  json(res, 404, { error: 'not found' });
}

async function readSite(root: string): Promise<{ site: Site | null; error: string | null }> {
  try {
    return { site: parseSite(JSON.parse(await fs.readFile(sitePath(root), 'utf8'))), error: null };
  } catch (error) {
    const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    return {
      site: null,
      error: missing ? null : error instanceof Error ? error.message : String(error),
    };
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  if (res.headersSent) return;
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          reject(new Error('invalid json'));
          return;
        }
        resolve(value as Record<string, unknown>);
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}


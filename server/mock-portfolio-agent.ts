import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import {
  type AgentApp,
  type AgentContext,
  agent,
  methods,
  ndJsonStream,
} from '@agentclientprotocol/sdk';
import { draftSite, featuredChoices, moveProjectFirst, rewriteSection } from '../shared/draft.ts';
import { detectIntent, parseFeaturedValue, portfolioSection } from '../shared/intent.ts';
import { parseSite } from '../shared/site.ts';
import type { GithubCache, Site } from '../shared/types.ts';
import { isLanguage, isTone } from '../shared/types.ts';

export function createPortfolioAgent(): AgentApp {
  return agent({ name: 'portfolio-demo' })
    .onRequest(methods.agent.initialize, async (ctx) => ({
      protocolVersion: ctx.params.protocolVersion,
      agentInfo: { name: 'portfolio-demo', version: '0.1.0' },
    }))
    .onRequest(methods.agent.session.new, async () => ({
      sessionId: Math.random().toString(16).slice(2, 14),
    }))
    .onNotification(methods.agent.session.cancel, async () => {})
    .onRequest(methods.agent.session.prompt, async (ctx) => {
      const text = ctx.params.prompt
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n');
      const sessionId = ctx.params.sessionId;
      const siteFile = text.match(/site path:\s*(\S+)/)?.[1];
      const cacheFile = text.match(/github cache:\s*(\S+)/)?.[1];
      if (!siteFile) {
        await say(ctx, sessionId, '沒有看到 site.json 的路徑。');
        return { stopReason: 'end_turn' as const };
      }
      const cache = cacheFile ? await readCache(ctx, sessionId, cacheFile) : null;
      const repoNames = cache?.repos.map((repo) => repo.name) ?? [];
      const intent = detectIntent(text, repoNames);
      const current = await readSite(ctx, sessionId, siteFile);
      if (intent.type === 'ask') {
        if (!cache) {
          await say(ctx, sessionId, '還沒有這個帳號的 GitHub 快取。請先在左側載入帳號。');
          return { stopReason: 'end_turn' as const };
        }
        const answers = await askBrief(ctx, sessionId, cache);
        if (!answers) return { stopReason: 'cancelled' as const };
        const drafted = draftSite(cache, answers, current);
        const wrote = await writeSite(ctx, sessionId, siteFile, drafted);
        if (!wrote) return { stopReason: 'cancelled' as const };
        await say(ctx, sessionId, '已依你選的語氣、語言與專案寫進作品集。');
        return { stopReason: 'end_turn' as const };
      }
      if (intent.type === 'sdet') {
        if (!current) {
          await say(ctx, sessionId, '還沒有作品集可以改。請先產生一頁。');
          return { stopReason: 'end_turn' as const };
        }
        const section = intent.section || portfolioSection(text) || 'about';
        const revised = rewriteSection(current, section);
        const wrote = await writeSite(ctx, sessionId, siteFile, revised);
        if (!wrote) return { stopReason: 'cancelled' as const };
        await say(ctx, sessionId, `只改了「${section}」，其他區段保持原樣。`);
        return { stopReason: 'end_turn' as const };
      }
      if (intent.type === 'reorder') {
        if (!current) {
          await say(ctx, sessionId, '還沒有作品集可以調整順序。');
          return { stopReason: 'end_turn' as const };
        }
        const revised = moveProjectFirst(current, intent.repo, cache);
        const wrote = await writeSite(ctx, sessionId, siteFile, revised);
        if (!wrote) return { stopReason: 'cancelled' as const };
        await say(ctx, sessionId, `已把 ${intent.repo} 放到精選專案的第一個。`);
        return { stopReason: 'end_turn' as const };
      }
      if (intent.type === 'unknown') {
        await say(
          ctx,
          sessionId,
          '示範代理可以：產生作品集、先詢問語氣與專案、把選取區段改成 SDET 主管口吻，或把某個專案放第一個。',
        );
        return { stopReason: 'end_turn' as const };
      }
      if (!cache) {
        await say(ctx, sessionId, '還沒有這個帳號的 GitHub 快取。請先在左側載入帳號。');
        return { stopReason: 'end_turn' as const };
      }
      const featured = intent.featured.length > 0 ? intent.featured : [];
      const drafted = draftSite(cache, { tone: intent.tone, language: intent.language, featured }, current);
      const wrote = await writeSite(ctx, sessionId, siteFile, drafted);
      if (!wrote) return { stopReason: 'cancelled' as const };
      await say(ctx, sessionId, '已根據快取的公開專案寫好作品集。');
      return { stopReason: 'end_turn' as const };
    });
}

async function askBrief(
  ctx: { client: AgentContext },
  sessionId: string,
  cache: GithubCache,
): Promise<{ tone: 'professional' | 'warm' | 'sdet'; language: 'zh-Hant' | 'en'; featured: string[] } | null> {
  const choices = featuredChoices(cache);
  const answer = await ctx.client.request(methods.client.elicitation.create, {
    mode: 'form',
    sessionId,
    message: '先確認作品集的語氣、語言，以及要放上首頁的專案。',
    requestedSchema: {
      type: 'object',
      properties: {
        tone: {
          type: 'string',
          title: '語氣',
          oneOf: [
            { const: 'professional', title: '專業精煉' },
            { const: 'warm', title: '親切敘事' },
            { const: 'sdet', title: 'SDET 主管' },
          ],
        },
        language: {
          type: 'string',
          title: '語言',
          oneOf: [
            { const: 'zh-Hant', title: '繁體中文' },
            { const: 'en', title: 'English' },
          ],
        },
        featured: {
          type: 'string',
          title: '要放上首頁的專案',
          oneOf: choices.map((choice) => ({ const: choice.value, title: choice.label })),
        },
      },
    },
  });
  if (answer.action !== 'accept' || !answer.content || typeof answer.content !== 'object') return null;
  const content = answer.content as { tone?: unknown; language?: unknown; featured?: unknown };
  const tone = typeof content.tone === 'string' && isTone(content.tone) ? content.tone : 'professional';
  const language = typeof content.language === 'string' && isLanguage(content.language) ? content.language : 'zh-Hant';
  const featured = typeof content.featured === 'string' ? parseFeaturedValue(content.featured) : [];
  return { tone, language, featured };
}

async function readCache(
  ctx: { client: AgentContext },
  sessionId: string,
  file: string,
): Promise<GithubCache | null> {
  const raw = await readText(ctx, sessionId, file);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GithubCache;
  } catch {
    return null;
  }
}

async function readSite(ctx: { client: AgentContext }, sessionId: string, file: string): Promise<Site | null> {
  const raw = await readText(ctx, sessionId, file);
  if (!raw) return null;
  try {
    return parseSite(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readText(
  ctx: { client: AgentContext },
  sessionId: string,
  file: string,
): Promise<string | null> {
  try {
    const result = await ctx.client.request(methods.client.fs.readTextFile, { sessionId, path: file });
    return result.content;
  } catch {
    return null;
  }
}

async function writeSite(
  ctx: { client: AgentContext },
  sessionId: string,
  file: string,
  site: Site,
): Promise<boolean> {
  const content = `${JSON.stringify(site, null, 2)}\n`;
  await ctx.client.notify(methods.client.session.update, {
    sessionId,
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'write-site',
      title: '寫入 data/site.json',
      name: 'write',
      kind: 'edit',
      status: 'pending',
      locations: [{ path: file }],
    },
  });
  const permission = await ctx.client.request(methods.client.session.requestPermission, {
    sessionId,
    toolCall: {
      toolCallId: 'write-site',
      title: '寫入 data/site.json',
      name: 'write',
      kind: 'edit',
      status: 'pending',
      locations: [{ path: file }],
    },
    options: [
      { optionId: 'allow', name: '允許寫入', kind: 'allow_once' },
      { optionId: 'reject', name: '拒絕', kind: 'reject_once' },
    ],
  });
  const outcome = permission.outcome;
  if (!(outcome.outcome === 'selected' && outcome.optionId === 'allow')) return false;
  await ctx.client.request(methods.client.fs.writeTextFile, { sessionId, path: file, content });
  await ctx.client.notify(methods.client.session.update, {
    sessionId,
    update: { sessionUpdate: 'tool_call_update', toolCallId: 'write-site', status: 'completed' },
  });
  return true;
}

async function say(ctx: { client: AgentContext }, sessionId: string, text: string) {
  await ctx.client.notify(methods.client.session.update, {
    sessionId,
    update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
  });
}

export function portfolioMockPath(): string {
  return fileURLToPath(new URL('./mock-portfolio-agent.ts', import.meta.url));
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry && entry === fileURLToPath(import.meta.url)) {
  const stream = ndJsonStream(
    Writable.toWeb(process.stdout),
    Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
  );
  createPortfolioAgent().connect(stream);
}

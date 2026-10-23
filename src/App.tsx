import { AgentDock, AgentPanelRoot, useAgentState, useCapability } from '@agent-panel/react';
import '@agent-panel/react/styles.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sectionLabel, sectionSnapshot } from '../shared/draft.ts';
import { renderSiteHtml } from '../shared/render.ts';
import type { Site, ThemeId } from '../shared/types.ts';
import { THEMES } from '../shared/types.ts';

type AgentMode = 'mock' | 'claude-code' | 'codex';

const THEME_LABEL: Record<ThemeId, string> = {
  ink: '紙本',
  studio: '工作室',
  night: '夜航',
};

const AGENT_LABEL: Record<AgentMode, string> = {
  mock: 'Mock 示範',
  'claude-code': 'Claude Code',
  codex: 'Codex',
};

const SECTIONS = [
  ['hero', '首頁'],
  ['about', '關於'],
  ['projects', '專案'],
  ['skills', '技能'],
  ['contact', '聯絡'],
] as const;

export function App() {
  return (
    <AgentPanelRoot>
      <Studio />
    </AgentPanelRoot>
  );
}

function Studio() {
  const panel = useAgentState();
  const task = useCapability('portfolio');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [siteError, setSiteError] = useState<string | null>(null);
  const [username, setUsername] = useState('Jacky97s');
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [section, setSection] = useState('');
  const [agent, setAgent] = useState<AgentMode>('mock');
  const [subscription, setSubscription] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const results = panel.items.filter((item) => item.kind === 'result').length;

  const reload = useCallback(async () => {
    const response = await fetch('/api/site');
    const body = (await response.json()) as { site: Site | null; error: string | null };
    setSite(body.site);
    setSiteError(body.error);
  }, []);

  useEffect(() => {
    void reload();
    void fetch('/api/agent')
      .then((response) => response.json())
      .then((body: { agent: AgentMode; subscription: boolean }) => {
        setAgent(body.agent);
        setSubscription(body.subscription);
      });
  }, [reload]);

  useEffect(() => {
    if (results) void reload();
  }, [results, reload]);

  useEffect(() => {
    if (!panel.running) return;
    const timer = window.setInterval(() => {
      void reload();
    }, 700);
    return () => window.clearInterval(timer);
  }, [panel.running, reload]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/github?username=${encodeURIComponent(username)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { fetchedAt: string | null }) => setCachedAt(body.fetchedAt))
      .catch(() => undefined);
    return () => controller.abort();
  }, [username]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; section?: string };
      if (data?.type === 'portfolio-select' && typeof data.section === 'string') setSection(data.section);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const html = useMemo(() => (site ? renderSiteHtml(site, { interactive: true }) : ''), [site]);

  const highlight = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'portfolio-select', section }, '*');
  }, [section]);

  useEffect(() => {
    highlight();
  }, [highlight, html]);

  const context = useMemo(() => {
    const snapshot = site && section ? sectionSnapshot(site, section) : null;
    return {
      file: 'data/site.json',
      section,
      selection: snapshot ? JSON.stringify(snapshot).slice(0, 3500) : '',
      username,
    };
  }, [site, section, username]);

  async function ensureCache() {
    const existing = await fetch(`/api/github?username=${encodeURIComponent(username)}`).then(
      (response) => response.json() as Promise<{ cached: boolean }>,
    );
    if (existing.cached) return;
    setBusy('載入 GitHub');
    const response = await fetch('/api/github', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const body = (await response.json()) as { error?: string; fetchedAt?: string };
    if (!response.ok) throw new Error(body.error ?? '載入失敗');
    setCachedAt(body.fetchedAt ?? null);
  }

  async function loadGithub() {
    setNotice('');
    setBusy('載入 GitHub');
    try {
      const response = await fetch('/api/github', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const body = (await response.json()) as { error?: string; fetchedAt?: string; repos?: number };
      if (!response.ok) throw new Error(body.error ?? '載入失敗');
      setCachedAt(body.fetchedAt ?? null);
      setNotice(`已快取 ${username} 的公開資料${body.repos ? `，${body.repos} 個專案` : ''}。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function ask(text: string) {
    setNotice('');
    try {
      if (/生一個|產生|詢問|作品集/.test(text)) await ensureCache();
      await task.run(text, context);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function changeTheme(theme: ThemeId) {
    if (!site) return;
    setSite({ ...site, theme });
    const response = await fetch('/api/site', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setNotice(body.error ?? '主題沒有寫入');
      void reload();
    }
  }

  async function exportSite() {
    setBusy('匯出');
    setNotice('');
    try {
      const response = await fetch('/api/export', { method: 'POST' });
      const body = (await response.json()) as { error?: string; path?: string };
      if (!response.ok) throw new Error(body.error ?? '匯出失敗');
      setNotice(`已寫入 ${body.path}，可以單獨部署這個檔案。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function changeAgent(next: AgentMode) {
    if (next === agent) return;
    setNotice('正在切換代理，頁面即將重新載入。');
    await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agent: next }),
    });
    window.setTimeout(() => window.location.reload(), 600);
  }

  const docked = panel.open;
  const paid = subscription;

  return (
    <>
      <div className={`shell${docked ? ' is-docked' : ''}${paid ? ' agent-paid' : ''}`} data-agent={agent}>
        <header className="topbar">
          <div className="brand">
            <span className="mark">Folio</span>
            <div>
              <strong>作品集產生器</strong>
              <p>公開 GitHub 資料，排成一頁可以部署的網站。</p>
            </div>
          </div>
          <div className="agent-slot">
            <label className="agent-pick">
              <span>代理</span>
              <select
                aria-label="代理"
                value={agent}
                onChange={(event) => void changeAgent(event.target.value as AgentMode)}
              >
                {(Object.keys(AGENT_LABEL) as AgentMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {AGENT_LABEL[mode]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <aside className="rail">
          <form
            className="account"
            onSubmit={(event) => {
              event.preventDefault();
              void loadGithub();
            }}
          >
            <label htmlFor="login">GitHub 帳號</label>
            <div className="account-row">
              <input
                id="login"
                value={username}
                spellCheck={false}
                autoCapitalize="off"
                onChange={(event) => setUsername(event.target.value.trim())}
              />
              <button type="submit" disabled={busy === '載入 GitHub'}>
                載入
              </button>
            </div>
            <p className="hint">{cachedAt ? `快取於 ${cachedAt.slice(0, 10)}` : '尚未快取'}</p>
          </form>
          <div className="themes" role="group" aria-label="主題">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={site?.theme === theme}
                disabled={!site}
                onClick={() => void changeTheme(theme)}
              >
                {THEME_LABEL[theme]}
              </button>
            ))}
          </div>
          <div className="sections">
            <p className="rail-label">區段</p>
            {SECTIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={section === id ? 'is-on' : ''}
                aria-pressed={section === id}
                onClick={() => setSection(section === id ? '' : id)}
              >
                <span>{label}</span>
                {section === id ? <em>已選取</em> : null}
              </button>
            ))}
            {site && section.startsWith('project:') ? (
              <p className="hint">專案 {section.slice('project:'.length)} 已選取</p>
            ) : null}
          </div>
          <div className="actions">
            <button type="button" onClick={() => void ask(`幫我用 ${username} 生一個作品集`)}>
              用這個帳號生一個作品集
            </button>
            <button type="button" onClick={() => void ask('請先詢問語氣、語言，以及要放上首頁的專案')}>
              先問語氣與專案
            </button>
            <button
              type="button"
              disabled={!section}
              onClick={() => void ask('這段寫得更像 SDET 主管')}
            >
              這段改成 SDET 主管口吻
            </button>
            <button type="button" onClick={() => void ask('把 agent-panel 放第一個')}>
              把 agent-panel 放第一個
            </button>
            <button type="button" className="export" disabled={!site || busy === '匯出'} onClick={() => void exportSite()}>
              匯出靜態 HTML
            </button>
          </div>
          <p className="fine">
            {section
              ? `代理只會改「${sectionLabel(section)}」。`
              : '點預覽或左側區段，代理就只改那一段。'}
            <br />
            代理只寫入 data/site.json。
          </p>
          {notice ? <p className="notice">{notice}</p> : null}
          {siteError ? <p className="notice">{siteError}</p> : null}
        </aside>
        <main className="stage">
          {site ? (
            <iframe
              ref={frameRef}
              title="作品集預覽"
              srcDoc={html}
              onLoad={highlight}
            />
          ) : (
            <div className="empty">
              <p>還沒有作品集。</p>
              <p>載入 GitHub 帳號，然後請代理產生一頁。</p>
            </div>
          )}
        </main>
        {docked && paid ? <p className="sub-note">本次使用你自己的訂閱，額外 API 費用 $0</p> : null}
      </div>
      <AgentDock capabilityId="portfolio" context={context} />
    </>
  );
}

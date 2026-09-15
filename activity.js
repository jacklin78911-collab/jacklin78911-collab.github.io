(() => {
  const user = 'jacklin78911-collab';
  const interval = 5 * 60 * 1000;
  const cacheKey = 'liqian-github-activity-v1';
  const sources = [
    { id: 'vllm', repo: 'vllm-project/vllm', featured: 47744, limit: 1 },
    { id: 'mooncake', repo: 'kvcache-ai/Mooncake', limit: 3 }
  ];
  let cache = {};
  let lastAttempt = 0;
  let nextAllowed = 0;
  let pending = false;
  try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch { /* Storage is optional. */ }
  if (!cache || typeof cache !== 'object') cache = {};

  function stamp(time) {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(time));
  }
  function render(source, record, stale = false) {
    const container = document.getElementById(source.id + '-feed');
    const fragment = document.createDocumentFragment();
    for (const item of record.items.filter(item => item.number !== source.featured).slice(0, source.limit)) {
      const link = document.createElement('a');
      link.className = 'activity-row';
      link.href = 'https://github.com/' + source.repo + '/pull/' + item.number;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const main = document.createElement('span');
      main.className = 'activity-main';
      const title = document.createElement('strong');
      title.textContent = item.title.replace(/^(\[[^\]]+\]\s*)+/, '');
      const meta = document.createElement('small');
      meta.textContent = '#' + item.number + ' · ' + item.updated.slice(0, 10).replaceAll('-', '.');
      main.append(title, meta);
      const state = document.createElement('span');
      state.className = 'pr-state ' + item.state;
      state.textContent = { merged: '已合并', open: '进行中', closed: '已关闭' }[item.state];
      const arrow = document.createElement('span');
      arrow.className = 'link-arrow';
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');
      link.append(main, state, arrow);
      fragment.append(link);
    }
    if (!fragment.childNodes.length) {
      const empty = document.createElement('p');
      empty.className = 'feed-empty';
      empty.textContent = '暂无其他动态';
      fragment.append(empty);
    }
    // Keep focus and text selection intact while the visitor is reading a PR.
    const selected = document.getSelection();
    const interacting = container.contains(document.activeElement) ||
      (selected && !selected.isCollapsed && container.contains(selected.anchorNode));
    if (interacting) return;
    container.replaceChildren(fragment);
    document.getElementById(source.id + '-sync').textContent =
      (stale ? '缓存 · ' : 'GitHub · ') + stamp(record.checkedAt);
  }

  for (const source of sources) {
    const record = cache[source.id];
    if (record && Array.isArray(record.items) && Number.isFinite(record.checkedAt)) {
      render(source, record, Date.now() - record.checkedAt > interval);
    }
  }

  async function refreshActivity() {
    const now = Date.now();
    if (pending || document.hidden || now - lastAttempt < interval || now < nextAllowed) return;
    if (sources.every(source => cache[source.id] && now - cache[source.id].checkedAt < interval)) return;
    pending = true;
    lastAttempt = now;
    try {
      for (const source of sources) {
        try {
          const params = new URLSearchParams({
            q: 'author:' + user + ' repo:' + source.repo + ' is:pr',
            sort: 'updated', order: 'desc', per_page: '10'
          });
          const response = await fetch('https://api.github.com/search/issues?' + params, {
            headers: { Accept: 'application/vnd.github+json' },
            credentials: 'omit',
            signal: AbortSignal.timeout(12000)
          });
          if (!response.ok) {
            if (response.status === 403 || response.status === 429) {
              const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
              const retry = Number(response.headers.get('retry-after')) * 1000;
              nextAllowed = Math.max(now + interval, Number.isFinite(reset) ? reset : 0, now + retry);
            }
            throw new Error('GitHub ' + response.status);
          }
          const data = await response.json();
          if (!Array.isArray(data.items) || data.incomplete_results) throw new Error('Incomplete GitHub response');
          const items = data.items
            .filter(item => Number.isInteger(item.number) && item.pull_request)
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .slice(0, 3)
            .map(item => ({
              number: item.number, title: item.title, updated: item.updated_at,
              state: item.pull_request.merged_at ? 'merged' : item.state === 'open' ? 'open' : 'closed'
            }));
          const record = { items, checkedAt: Date.now() };
          cache[source.id] = record;
          render(source, record);
          try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* Continue without a persistent cache. */ }
        } catch {
          if (cache[source.id]) render(source, cache[source.id], true);
          else {
            const status = document.getElementById(source.id + '-sync');
            status.textContent = '暂无法同步 · 显示 ' + status.dataset.snapshot + ' 数据';
          }
          if (Date.now() < nextAllowed) break;
        }
      }
    } finally { pending = false; }
  }

  async function loadPosts() {
    try {
      const response = await fetch('./posts.json', { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.posts)) return;
      const container = document.getElementById('posts');
      if (container.contains(document.activeElement)) return;
      if (!data.posts.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-posts';
        empty.textContent = '暂未发布文章。';
        container.replaceChildren(empty);
        document.getElementById('post-count').textContent = '00';
        return;
      }
      const fragment = document.createDocumentFragment();
      let count = 0;
      for (const post of [...data.posts].sort((a, b) => b.date.localeCompare(a.date))) {
        const url = new URL(post.url, location.href);
        if (!['https:', 'http:'].includes(url.protocol) || !post.title || !post.date) continue;
        const link = document.createElement('a');
        link.className = 'post-row';
        link.href = url.href;
        const date = document.createElement('small');
        date.textContent = post.date;
        const title = document.createElement('h3');
        title.textContent = post.title;
        link.append(date, title);
        if (post.summary) {
          const description = document.createElement('p');
          description.textContent = post.summary;
          link.append(description);
        }
        fragment.append(link);
        count++;
      }
      if (count) {
        document.getElementById('posts').replaceChildren(fragment);
        document.getElementById('post-count').textContent = String(count).padStart(2, '0');
      }
    } catch { /* The static blog state remains readable offline. */ }
  }

  refreshActivity();
  loadPosts();
  setInterval(() => {
    if (!document.hidden) { refreshActivity(); loadPosts(); }
  }, interval);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshActivity();
  });
})();


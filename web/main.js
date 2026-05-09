const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const chainSelect = $('#chain');
const healthDot = $('#health-dot');

function getChain() {
  return chainSelect.value || 'mainnet';
}

async function api(path, init) {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({ ok: false, error: { code: 'PARSE', message: 'Non-JSON response' } }));
  return { status: res.status, body };
}

function renderResult(targetId, { status, body }) {
  const wrap = $(`#${targetId}`);
  wrap.classList.add('show');
  wrap.classList.toggle('error', !body.ok);

  const meta = body.meta ?? {};
  const pillClass = !body.ok ? 'err' : meta.cached ? 'cached' : 'fresh';
  const pillLabel = !body.ok ? 'error' : meta.cached ? 'cached' : 'fresh';

  wrap.innerHTML = `
    <div class="meta">
      <span class="pill ${pillClass}">${pillLabel}</span>
      <span>status ${status}</span>
      ${meta.chain ? `<span>chain ${escapeHtml(meta.chain)}</span>` : ''}
      ${typeof meta.latency_ms === 'number' ? `<span>${meta.latency_ms} ms</span>` : ''}
    </div>
    <pre>${escapeHtml(JSON.stringify(body, null, 2))}</pre>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function setBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = busy;
}

// ─── Tab switching ───────────────────────────────────────────────────────────
$$('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    const target = t.dataset.target;
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === target));
  });
});

// ─── Forms ────────────────────────────────────────────────────────────────────
const handlers = {
  async balance(form) {
    const address = form.address.value.trim();
    const chain = getChain();
    const r = await api(`/v1/balance/${encodeURIComponent(address)}?chain=${chain}`);
    renderResult('r-balance', r);
  },

  async ens(form) {
    const input = form.input.value.trim();
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(input);
    const path = isAddress
      ? `/v1/ens/reverse/${encodeURIComponent(input)}`
      : `/v1/ens/resolve/${encodeURIComponent(input)}`;
    const r = await api(path);
    renderResult('r-ens', r);
  },

  async block(form) {
    const num = form.number.value.trim();
    const chain = getChain();
    const path = num === '' || num.toLowerCase() === 'latest'
      ? `/v1/block/latest?chain=${chain}`
      : `/v1/block/${encodeURIComponent(num)}?chain=${chain}`;
    const r = await api(path);
    renderResult('r-block', r);
  },

  async token(form) {
    const token = form.token.value.trim();
    const holder = form.holder.value.trim();
    const chain = getChain();
    const path = holder
      ? `/v1/token/${encodeURIComponent(token)}/balance/${encodeURIComponent(holder)}?chain=${chain}`
      : `/v1/token/${encodeURIComponent(token)}?chain=${chain}`;
    const r = await api(path);
    renderResult('r-token', r);
  },

  async events(form) {
    const token = form.token.value.trim();
    const chain = getChain();
    const params = new URLSearchParams({ chain });
    if (form.blocks.value) params.set('blocks', form.blocks.value);
    if (form.limit.value) params.set('limit', form.limit.value);
    if (form.from.value.trim()) params.set('from', form.from.value.trim());
    if (form.to.value.trim()) params.set('to', form.to.value.trim());
    const r = await api(`/v1/events/transfers/${encodeURIComponent(token)}?${params}`);
    renderResult('r-events', r);
  },

  async simulate(form) {
    const chain = getChain();
    let args;
    try {
      args = JSON.parse(form.args.value || '[]');
      if (!Array.isArray(args)) throw new Error('args must be a JSON array');
    } catch (e) {
      renderResult('r-simulate', {
        status: 400,
        body: { ok: false, error: { code: 'CLIENT_VALIDATION', message: `args: ${e.message}` } },
      });
      return;
    }
    const abi = form.abi.value.split('\n').map((s) => s.trim()).filter(Boolean);
    const body = {
      chain,
      to: form.to.value.trim(),
      from: form.from.value.trim() || undefined,
      value: form.value.value.trim() || undefined,
      abi,
      functionName: form.functionName.value.trim(),
      args,
    };
    const r = await api('/v1/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    renderResult('r-simulate', r);
  },
};

$$('form[data-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kind = form.dataset.form;
    const handler = handlers[kind];
    if (!handler) return;
    setBusy(form, true);
    try { await handler(form); }
    catch (err) {
      renderResult(`r-${kind}`, {
        status: 0,
        body: { ok: false, error: { code: 'NETWORK', message: err?.message ?? String(err) } },
      });
    } finally {
      setBusy(form, false);
    }
  });
});

// ─── Health ping ──────────────────────────────────────────────────────────────
async function pingHealth() {
  try {
    const { body } = await api('/health');
    healthDot.classList.toggle('ok', !!body.ok);
    healthDot.classList.toggle('bad', !body.ok);
    if (body.data?.chains?.length || body.chains?.length) {
      const chains = body.chains ?? body.data?.chains ?? [];
      const current = chainSelect.value;
      chainSelect.innerHTML = chains.map((c) => `<option value="${c}">${c}</option>`).join('');
      if (chains.includes(current)) chainSelect.value = current;
    }
  } catch {
    healthDot.classList.add('bad');
  }
}
pingHealth();
setInterval(pingHealth, 30_000);

// Reflect actual port in footer
$('#footer-port').textContent = `:${location.port || '3001'}`;

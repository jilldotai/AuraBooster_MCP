/* dashboard.js — J.I.L.L. Owner Console */
const tokenInput = document.getElementById('tokenInput');
const connectBtn = document.getElementById('connect');
const connectStatus = document.getElementById('connectStatus');
const statusList = document.getElementById('statusList');
const radarResult = document.getElementById('radarResult');
const runRadarBtn = document.getElementById('runRadar');
const assetsGrid = document.getElementById('assetsGrid');
const quotesList = document.getElementById('quotesList');
const auditLog = document.getElementById('auditLog');
const evidenceList = document.getElementById('evidenceList');

let token = sessionStorage.getItem('jill_admin_token') || '';
if (token) { tokenInput.value = token; attemptConnect(); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function attemptConnect() {
  token = tokenInput.value.trim();
  if (!token) { connectStatus.textContent = 'Enter your admin token.'; connectStatus.className = 'err'; return; }
  connectStatus.textContent = 'Connecting…'; connectStatus.className = '';

  try {
    const res = await fetch('/api/admin/status', { headers: authHeaders() });
    if (res.status === 401) throw new Error('Invalid token.');
    if (!res.ok) throw new Error('Server error.');
    const json = await res.json();

    sessionStorage.setItem('jill_admin_token', token);
    connectStatus.textContent = '✓ Connected';
    connectStatus.className = 'ok';
    renderStatus(json);
    runRadarBtn.disabled = false;

    // Mark Cloud Run evidence as done
    document.getElementById('ev-cloudrun')?.classList.add('done');
    if (json.gemini) document.getElementById('ev-gemini')?.classList.add('done');

    await loadAudit();
    renderQuoteList(json.quotes || []);
  } catch (err) {
    connectStatus.textContent = err.message;
    connectStatus.className = 'err';
  }
}

function renderStatus(data) {
  const env = data.environment || 'unknown';
  const rows = [
    ['Environment', env, env.includes('Cloud') || env.includes('firestore')],
    ['Gemini / Vertex AI', data.gemini ? 'online' : 'fallback', data.gemini],
    ['WhatsApp', data.whatsapp ? 'online' : 'not connected', data.whatsapp],
    ['EFT fallback', data.eftFallback ? 'configured' : 'not set', data.eftFallback],
    ['Admin protection', data.adminProtection ? 'enabled' : 'off', data.adminProtection],
  ];
  statusList.innerHTML = rows.map(([label, val, ok]) =>
    `<li><span>${label}</span><span class="${ok ? 'status-ok' : 'status-off'}">${val}</span></li>`
  ).join('');
}

function renderQuoteList(quotes) {
  if (!quotes.length) { quotesList.innerHTML = '<p class="card-body muted" style="font-size:0.85rem;">No quotes yet. Submit the demo form to create one.</p>'; return; }
  quotesList.innerHTML = quotes.map(q => `
    <div class="quote-item">
      <div class="q-id">${q.id}</div>
      <div class="q-meta">${q.businessName} · ${new Date(q.createdAt).toLocaleString()}</div>
      <div class="q-actions">
        <a href="/api/quotes/${q.id}.pdf" target="_blank" class="btn-ghost" style="padding:0.4rem 0.9rem;font-size:0.8rem;">PDF</a>
        ${!q.approved ? `<button onclick="approveQuote('${q.id}', this)" class="btn-primary" style="padding:0.4rem 0.9rem;font-size:0.8rem;">Approve</button>` : '<span class="status-ok">✓ Approved</span>'}
      </div>
    </div>
  `).join('');
}

window.approveQuote = async function(id, btn) {
  btn.disabled = true; btn.textContent = 'Approving…';
  try {
    const res = await fetch(`/api/quotes/${id}/approve`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ approved: true }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed');
    btn.parentElement.innerHTML = '<span class="status-ok">✓ Approved</span>';
    document.getElementById('ev-customer')?.classList.add('done');
  } catch (err) {
    btn.textContent = 'Approve'; btn.disabled = false;
    alert('Approval failed: ' + err.message);
  }
};

runRadarBtn?.addEventListener('click', async () => {
  runRadarBtn.disabled = true;
  runRadarBtn.textContent = 'Running…';
  radarResult.textContent = 'Calling Gemini…';
  try {
    const res = await fetch('/api/radar/run', { method: 'POST', headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Radar failed.');
    const w = json.winner;
    radarResult.innerHTML = `
      <span class="radar-badge">Score ${w.score}</span>
      <strong style="display:block;margin:0.5rem 0;color:var(--text-primary)">${w.niche}</strong>
      <span style="color:var(--text-muted);font-size:0.82rem;">${w.region}</span>
      <p style="margin-top:0.75rem;font-size:0.82rem;color:var(--text-secondary);">${(w.evidence || []).join(' · ')}</p>
    `;
    renderAssets(json.assets, w);
    await loadAudit();
  } catch (err) {
    radarResult.textContent = 'Error: ' + err.message;
  } finally {
    runRadarBtn.disabled = false;
    runRadarBtn.textContent = 'Run radar again';
  }
});

function renderAssets(assets, winner) {
  if (!assets || typeof assets !== 'object') return;
  const entries = [
    ['Video hook', assets.videoHook],
    ['Landing headline', assets.landingHeadline],
    ['Community question', assets.communityQuestion],
    ['Reply draft', assets.replyDraft],
    ['Why now', assets.whyNow],
  ].filter(([, v]) => v);

  if (!entries.length) return;
  assetsGrid.innerHTML = `
    <p style="font-size:0.78rem;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:0.5rem;">PENDING APPROVAL — ${winner.niche} / ${winner.region}</p>
    ${entries.map(([label, val]) => `
      <div class="asset-item">
        <h4>${label}</h4>
        <p>${val}</p>
      </div>
    `).join('')}
  `;
}

async function loadAudit() {
  try {
    const res = await fetch('/api/admin/audit', { headers: authHeaders() });
    if (!res.ok) return;
    const events = await res.json();
    if (!events.length) { auditLog.innerHTML = '<p class="card-body muted" style="font-size:0.85rem;">No events recorded yet.</p>'; return; }
    auditLog.innerHTML = events.map(ev => `
      <div class="audit-entry">
        <span class="a-time">${new Date(ev.at).toLocaleTimeString()}</span>
        <span class="a-actor">[${ev.actor}]</span>
        <span class="a-type"> ${ev.type}</span>
        — ${ev.summary}
        <span style="color:var(--text-muted);margin-left:0.5rem;">(${ev.status})</span>
      </div>
    `).join('');
    if (events.length > 2) document.getElementById('ev-gemini')?.classList.add('done');
  } catch { /* silent */ }
}

connectBtn?.addEventListener('click', attemptConnect);
tokenInput?.addEventListener('keydown', e => { if (e.key === 'Enter') attemptConnect(); });

/* ══════════════════════════════════════════════════════════════
   api-manager.js — API Configuration Console
   Manages provider selection, model choice, and API keys
   (persisted to localStorage), tests connectivity, and exposes
   window.ApiManager.generate(prompt) used by the other two modules
   to power AI-generated summaries / explanations.
   ══════════════════════════════════════════════════════════════ */

(function () {
  const STORAGE_KEY = 'asthmai_api_config';

  const MODELS = {
    gemini: ['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    claude: ['claude-sonnet-5', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    agentrouter: ['gpt-5', 'gpt-5.5', 'glm-5.2', 'claude-sonnet-5', 'claude-opus-4-8'],
    custom: ['default']
  };
  const AGENTROUTER_ENDPOINT = 'https://agentrouter.org/v1/chat/completions';

  let config = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    endpoint: '',
    apiKey: ''
  };

  /* ── PERSISTENCE ─────────────────────────────────────────────── */
  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) config = Object.assign(config, saved);
    } catch (e) { /* ignore corrupt storage */ }
  }

  function saveConfig() {
    config.provider = document.querySelector('.provider-card.selected').dataset.provider;
    config.model = document.getElementById('api-model-select').value;
    config.endpoint = document.getElementById('api-custom-endpoint').value.trim();
    config.apiKey = document.getElementById('api-key-input').value.trim();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    renderSummary();
    const result = document.getElementById('conn-test-result');
    result.className = 'conn-test ok';
    result.textContent = window.T('api-config-saved');
  }

  /* ── UI RENDERING ────────────────────────────────────────────── */
  function populateModelSelect() {
    const sel = document.getElementById('api-model-select');
    sel.innerHTML = MODELS[config.provider].map(m => `<option value="${m}">${m}</option>`).join('');
    if (MODELS[config.provider].includes(config.model)) sel.value = config.model;
    document.getElementById('custom-endpoint-row').style.display = config.provider === 'custom' ? 'block' : 'none';
    document.getElementById('model-select-row').style.display = config.provider === 'custom' ? 'none' : 'block';
    document.getElementById('agentrouter-key-link-row').style.display = config.provider === 'agentrouter' ? 'block' : 'none';
  }

  function renderProviderSelection() {
    document.querySelectorAll('.provider-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.provider === config.provider);
    });
    populateModelSelect();
  }

  function renderFormFromConfig() {
    document.getElementById('api-key-input').value = config.apiKey || '';
    document.getElementById('api-custom-endpoint').value = config.endpoint || '';
    renderProviderSelection();
  }

  function renderSummary() {
    const el = document.getElementById('api-config-summary');
    const providerLabel = { gemini: 'Google Gemini', claude: 'Anthropic Claude', agentrouter: 'AgentRouter', custom: 'Custom Endpoint' }[config.provider];
    const keyMasked = config.apiKey ? config.apiKey.slice(0, 4) + '••••••••' + config.apiKey.slice(-3) : '—';
    el.innerHTML = `
      <div class="mini-stat"><b style="font-size:13px;">${providerLabel}</b><span>PROVIDER</span></div>
      <div class="mini-stat"><b style="font-size:13px;">${config.provider === 'custom' ? (config.endpoint || '—') : config.model}</b><span>${config.provider === 'custom' ? 'ENDPOINT' : 'MODEL'}</span></div>
      <div class="mini-stat"><b style="font-size:13px;font-family:var(--font-mono);">${keyMasked}</b><span>API KEY</span></div>`;
  }

  /* ── CONNECTION TEST ─────────────────────────────────────────── */
  async function testConnection() {
    const result = document.getElementById('conn-test-result');
    const btn = document.getElementById('api-test-btn');
    saveConfig();
    if (!config.apiKey && config.provider !== 'custom') {
      result.className = 'conn-test err';
      result.textContent = window.T('api-key-missing');
      return;
    }
    btn.disabled = true;
    result.className = 'conn-test ok';
    result.textContent = window.T('api-testing');
    try {
      await generate('Reply with the single word: OK');
      result.className = 'conn-test ok';
      result.textContent = window.T('api-conn-ok');
    } catch (e) {
      result.className = 'conn-test err';
      result.textContent = window.T('api-conn-fail') + e.message;
    }
    btn.disabled = false;
  }

  /* ── LIVE LLM CALLS ──────────────────────────────────────────── */
  const REQUEST_TIMEOUT_MS = 30000;

  async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s — the provider may be slow, unreachable, or blocked (check network/CORS settings).`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function callGemini(prompt, opts) {
    const model = config.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: opts.maxTokens, temperature: opts.temperature }
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  async function callClaude(prompt, opts) {
    const model = config.model || 'claude-sonnet-5';
    const body = { model, max_tokens: opts.maxTokens, messages: [{ role: 'user', content: prompt }] };
    if (opts.system) body.system = opts.system;
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude ${res.status}: ${errBody.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = data.content?.map(b => b.text || '').join('\n');
    if (!text) throw new Error('Empty response from Claude');
    return text;
  }

  async function callOpenAiCompatible(endpoint, model, prompt, opts) {
    if (!endpoint) throw new Error('No endpoint configured');
    const messages = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: prompt });
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': 'Bearer ' + config.apiKey } : {})
      },
      body: JSON.stringify({
        model: model || 'default',
        messages,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature
      })
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`${endpoint} ${res.status}: ${errBody.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || data.content?.[0]?.text || data.text;
    if (!text) throw new Error('Unrecognized response shape from endpoint');
    return text;
  }

  async function callCustom(prompt, opts) {
    return callOpenAiCompatible(config.endpoint, 'default', prompt, opts);
  }

  async function callAgentRouter(prompt, opts) {
    return callOpenAiCompatible(AGENTROUTER_ENDPOINT, config.model || 'gpt-5', prompt, opts);
  }

  /**
   * generate(prompt, options)
   * options.system      — optional system instruction (grounding / role / accuracy rules)
   * options.maxTokens    — response length budget (default 1200 — enough for a genuinely
   *                        detailed, well-structured analytical answer instead of a
   *                        clipped one-paragraph reply)
   * options.temperature  — lower (default 0.3) favors accuracy/consistency over creative
   *                        variation, appropriate for data-grounded analysis
   */
  async function generate(prompt, options) {
    const opts = Object.assign({ maxTokens: 1200, temperature: 0.3, system: null }, options || {});
    if (config.provider === 'gemini') return callGemini(prompt, opts);
    if (config.provider === 'claude') return callClaude(prompt, opts);
    if (config.provider === 'agentrouter') return callAgentRouter(prompt, opts);
    return callCustom(prompt, opts);
  }

  /* ── EVENT WIRING ────────────────────────────────────────────── */
  function wireEvents() {
    document.querySelectorAll('.provider-card').forEach(card => {
      card.addEventListener('click', () => {
        config.provider = card.dataset.provider;
        renderProviderSelection();
      });
    });

    document.getElementById('toggle-key-visibility').addEventListener('click', () => {
      const input = document.getElementById('api-key-input');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('api-save-btn').addEventListener('click', saveConfig);
    document.getElementById('api-test-btn').addEventListener('click', testConnection);
  }

  function onLangChange() { renderSummary(); }

  function init() {
    loadConfig();
    renderFormFromConfig();
    renderSummary();
    wireEvents();
  }

  window.ApiManager = { init, generate, onLangChange, getConfig: () => ({ ...config, apiKey: undefined }) };
})();

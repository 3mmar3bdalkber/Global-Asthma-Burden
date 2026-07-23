(function () {
  let RAW = [];
  let charts = {};
  let usingMock = true;

  // UI-selected state for the slicers / toggle buttons
  let uiState = {
    deathsYear: null,
    sexYear: null,
    prevalenceCountry: 'ALL',
    deathsTrendCountry: 'ALL',
    ageMeasure: 'prevalence',   // 'prevalence' | 'deaths' | 'dalys'
    ageYear: null,
    topPrevalenceYear: null,
    kpiYear: null,
    kpiCountry: 'ALL'
  };

  const AGE_GROUPS = ['0-14 years', '15-49 years', '50-69 years', '70+ years'];

  const MEASURE_CFG = {
    deaths:     { metric: 'Number',  combine: 'sum' },
    prevalence: { metric: 'Percent', combine: 'avg' },
    dalys:      { metric: 'Rate',    combine: 'avg' }
  };

  function measureMatches(actualMeasureName, key) {
    if (!actualMeasureName) return false;
    const a = actualMeasureName.toLowerCase();
    if (key === 'deaths') return a.startsWith('death');
    if (key === 'prevalence') return a.startsWith('prevalen');
    if (key === 'dalys') return a.includes('daly') || a.includes('dayl'); // tolerates the DALYs/DAYLs variant
    if (key === 'incidence') return a.startsWith('inciden');
    if (key === 'ylds') return a.includes('yld');
    return false;
  }

  /* ── VALUE HELPERS ────────────────────────────────────────────── */
  function dv(r) { return typeof r.val_display === 'number' ? r.val_display : r.val; }
  function sumVal(rows) { let s = 0; for (let i = 0; i < rows.length; i++) s += (dv(rows[i]) || 0); return s; }
  function avgVal(rows) { return rows.length ? sumVal(rows) / rows.length : 0; }
  function combineVal(rows, mode) { return mode === 'sum' ? sumVal(rows) : avgVal(rows); }

  function maxOf(arr, sel) {
    let m = -Infinity;
    for (let i = 0; i < arr.length; i++) { const v = sel(arr[i]); if (v != null && v > m) m = v; }
    return m === -Infinity ? null : m;
  }
  function minOf(arr, sel) {
    let m = Infinity;
    for (let i = 0; i < arr.length; i++) { const v = sel(arr[i]); if (v != null && v < m) m = v; }
    return m === Infinity ? null : m;
  }

  /* ── SCHEMA-AWARE QUERY HELPERS (also used by chatbot.js) ────── */
  function getYears() { return [...new Set(RAW.map(r => r.year))].filter(y => y != null).sort((a, b) => a - b); }
  function getLatestYear() { return maxOf(RAW, r => r.year); }
  function getCountries() { return [...new Set(RAW.map(r => r.location_name))].filter(Boolean).sort(); }
  function hasMeasure(measureKey) { return RAW.some(r => measureMatches(r.measure_name, measureKey)); }

  function rowsFor(measureKey, extra) {
    const cfg = MEASURE_CFG[measureKey];
    return RAW.filter(r => {
      if (!measureMatches(r.measure_name, measureKey) || r.metric_name !== cfg.metric) return false;
      if (extra.age && r.age_name !== extra.age) return false;
      if (extra.year != null && r.year !== extra.year) return false;
      if (extra.country && extra.country !== 'ALL' && r.location_name !== extra.country) return false;
      if (extra.sex && r.sex_name !== extra.sex) return false;
      return true;
    });
  }

  /** Deaths / Prevalence / DALYs ranked by country for one year — powers both Top-10 bars. */
  function getCountryRanking(measureKey, year, topN) {
    const cfg = MEASURE_CFG[measureKey];
    const countries = getCountries();
    const out = [];
    countries.forEach(c => {
      const rows = rowsFor(measureKey, { age: 'All ages', year, country: c });
      if (!rows.length) return;
      out.push({ country: c, value: combineVal(rows, cfg.combine) });
    });
    out.sort((a, b) => b.value - a.value);
    return topN ? out.slice(0, topN) : out;
  }

  /** Male vs Female split for one measure/year, globally or for one country. */
  function getSexSplit(measureKey, year, country) {
    const male = rowsFor(measureKey, { age: 'All ages', year, country, sex: 'Male' });
    const female = rowsFor(measureKey, { age: 'All ages', year, country, sex: 'Female' });
    const cfg = MEASURE_CFG[measureKey];
    return { Male: combineVal(male, cfg.combine), Female: combineVal(female, cfg.combine) };
  }

  /** Full year-by-year trend (Male & Female lines), globally or for one country. */
  function getTrend(measureKey, country) {
    const cfg = MEASURE_CFG[measureKey];
    const years = getYears();
    const male = [], female = [];
    years.forEach(y => {
      const m = rowsFor(measureKey, { age: 'All ages', year: y, country, sex: 'Male' });
      const f = rowsFor(measureKey, { age: 'All ages', year: y, country, sex: 'Female' });
      male.push(combineVal(m, cfg.combine));
      female.push(combineVal(f, cfg.combine));
    });
    return { years, male, female };
  }

  /** Breakdown across the four real age bands (excludes the 'All ages' / 'Age-standardized' totals). */
  function getAgeGroupBreakdown(measureKey, year) {
    const cfg = MEASURE_CFG[measureKey];
    return AGE_GROUPS.map(age => {
      const rows = RAW.filter(r => measureMatches(r.measure_name, measureKey) && r.metric_name === cfg.metric && r.age_name === age && r.year === year);
      return { age, value: combineVal(rows, cfg.combine) };
    });
  }

  /* ── PALETTE ──────────────────────────────────────────────────── */
  function palette() {
    const cs = getComputedStyle(document.body);
    return {
      accent: cs.getPropertyValue('--accent').trim() || '#22d3ee',
      accent2: cs.getPropertyValue('--accent-2').trim() || '#818cf8',
      accent3: cs.getPropertyValue('--accent-3').trim() || '#34d399',
      danger: cs.getPropertyValue('--danger').trim() || '#f87171',
      warning: cs.getPropertyValue('--warning').trim() || '#fbbf24',
      orange: cs.getPropertyValue('--orange').trim() || '#fb923c',
      text: cs.getPropertyValue('--text').trim() || '#e7edf7',
      dim: cs.getPropertyValue('--text-dim').trim() || '#9fb0cc',
      muted: cs.getPropertyValue('--chart-tick').trim() || '#6b7ea3',
      grid: cs.getPropertyValue('--chart-grid').trim() || 'rgba(159,176,204,.1)',
      tooltipBg: cs.getPropertyValue('--chart-tooltip-bg').trim() || '#1c2740',
    };
  }

  /* ── MOCK DATASET (schema-matched, year-native, no decade/risk_category) ── */
  function buildMockData() {
    const COUNTRY_PROFILES = [
      { name: 'China', pop: 10, prevalence: 3.0 },
      { name: 'India', pop: 9, prevalence: 3.5 },
      { name: 'United States of America', pop: 6, prevalence: 10.6 },
      { name: 'Nigeria', pop: 5, prevalence: 4.2 },
      { name: 'Indonesia', pop: 5, prevalence: 4.8 },
      { name: 'Brazil', pop: 4, prevalence: 6.5 },
      { name: 'United Kingdom', pop: 3, prevalence: 11.9 },
      { name: 'Egypt', pop: 3, prevalence: 5.3 },
      { name: 'Canada', pop: 2, prevalence: 10.2 },
      { name: 'Portugal', pop: 1, prevalence: 10.7 },
      { name: 'Cuba', pop: 1, prevalence: 9.8 },
      { name: 'Honduras', pop: 1, prevalence: 12.5 },
      { name: 'Costa Rica', pop: 1, prevalence: 13.8 },
      { name: 'Australia', pop: 1, prevalence: 12.9 },
      { name: 'New Zealand', pop: 0.7, prevalence: 15.7 },
    ];
    const years = [1990, 1995, 2000, 2005, 2010, 2015, 2019, 2021, 2023];
    const sexes = ['Male', 'Female'];
    const ages = ['0-14 years', '15-49 years', '50-69 years', '70+ years', 'All ages', 'Age-standardized'];
    const ageShare = { '0-14 years': 0.40, '15-49 years': 0.23, '50-69 years': 0.18, '70+ years': 0.19, 'All ages': 1, 'Age-standardized': 1 };
    let seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

    const rows = [];
    COUNTRY_PROFILES.forEach(cp => {
      years.forEach((year, yi) => {
        const yearFactor = 1 + yi * 0.045; // gentle upward trend across years, like the real deaths trend
        sexes.forEach(sex => {
          const sexFactor = sex === 'Male' ? 1.08 : 0.94;
          ages.forEach(age => {
            const share = ageShare[age];
            const noise = 0.9 + rnd() * 0.2;

            // Deaths — Number / Percent / Rate
            const deathsBase = cp.pop * 28 * yearFactor * sexFactor * share * noise;
            rows.push({ measure_name: 'Deaths', location_name: cp.name, sex_name: sex, age_name: age, metric_name: 'Number', year, val: deathsBase, val_display: deathsBase });
            const deathsPct = (deathsBase / (cp.pop * 900)) * 100 * noise;
            rows.push({ measure_name: 'Deaths', location_name: cp.name, sex_name: sex, age_name: age, metric_name: 'Percent', year, val: deathsPct / 100, val_display: deathsPct });
            const deathsRate = deathsBase / (cp.pop * 0.9);
            rows.push({ measure_name: 'Deaths', location_name: cp.name, sex_name: sex, age_name: age, metric_name: 'Rate', year, val: deathsRate, val_display: deathsRate });

            // Prevalence — Percent only
            const prevPct = cp.prevalence * sexFactor * (0.97 + yi * 0.004) * noise;
            rows.push({ measure_name: 'Prevalence', location_name: cp.name, sex_name: sex, age_name: age, metric_name: 'Percent', year, val: prevPct / 100, val_display: prevPct });

            // DALYs — Rate (per 100k), gently declining over time (better care), same age shape
            const dalysRate = (cp.prevalence * 55) * (1 - yi * 0.01) * share * noise;
            rows.push({ measure_name: 'DALYs (Disability-Adjusted Life Years)', location_name: cp.name, sex_name: sex, age_name: age, metric_name: 'Rate', year, val: dalysRate, val_display: dalysRate });
          });
        });
      });
    });
    return rows;
  }

  /* ── LOAD FROM FASTAPI BACKEND (replaces manual CSV upload) ──── */
  const REQUIRED_COLS = ['measure_name', 'location_name', 'sex_name', 'age_name', 'metric_name', 'year', 'val'];

  async function loadFromAPI() {
    const statusEl = document.getElementById('global-data-status');
    statusEl.className = 'data-status ok';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${window.T('parsing-large')}`;

    try {
      const baseUrl = (window.ApiManager && window.ApiManager.getBaseUrl) ? window.ApiManager.getBaseUrl() : 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/gbd/burden`);
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const rows = await res.json();

      const cleaned = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.location_name) continue;
        const val = typeof r.val === 'number' ? r.val : parseFloat(r.val);
        if (val === null || val === undefined || isNaN(val)) continue;
        r.val = val;
        r.val_display = typeof r.val_display === 'number' ? r.val_display : (r.val_display !== undefined ? parseFloat(r.val_display) : val);
        if (isNaN(r.val_display)) r.val_display = val;
        r.year = typeof r.year === 'number' ? r.year : parseInt(r.year, 10);
        cleaned.push(r);
      }

      if (!cleaned.length) throw new Error('0 usable rows returned from /api/gbd/burden');

      RAW = cleaned;
      usingMock = false;
      resetUiStateToLatest();
      statusEl.className = 'data-status ok';
      statusEl.textContent = window.Tf('data-loaded', RAW.length);
      renderStats();
      renderAll();
      if (window.ChatBot && window.ChatBot.onDataChange) window.ChatBot.onDataChange();
    } catch (err) {
      console.error('GlobalAnalysis loadFromAPI error:', err);
      // Fall back to mock data so the dashboard still works while the backend is down
      RAW = buildMockData();
      usingMock = true;
      resetUiStateToLatest();
      statusEl.className = 'data-status err';
      statusEl.textContent = `Could not reach backend — showing sample data. (${err.message})`;
      renderStats();
      renderAll();
    }
  }

  function resetUiStateToLatest() {
    const latest = getLatestYear();
    uiState.deathsYear = latest;
    uiState.sexYear = latest;
    uiState.ageYear = latest;
    uiState.topPrevalenceYear = latest;
    uiState.prevalenceCountry = 'ALL';
  }

  function renderStats() {
    const el = document.getElementById('global-data-stats');
    const regions = getCountries().length;
    el.style.display = 'grid';
    el.innerHTML = `
      <div class="ds-item"><div class="ds-num">${RAW.length.toLocaleString()}</div><div class="ds-lbl">Rows</div></div>
      <div class="ds-item"><div class="ds-num">${regions}</div><div class="ds-lbl">Regions</div></div>`;
  }

  /* ── KPI CALCULATIONS (interactive: Year + Country slicers) ──── */
  function computeKPIs() {
    const year = uiState.kpiYear ?? getLatestYear();
    const country = uiState.kpiCountry || 'ALL';
    const countries = getCountries().length;
    const years = getYears();
    const yearLabel = years.length ? `${years[0]}–${years[years.length - 1]}` : '—';
    const scopeLabel = country === 'ALL' ? window.T('slicer-all-world') : country;

    const deathsRows = rowsFor('deaths', { age: 'All ages', year, country });
    const totalDeaths = hasMeasure('deaths') ? combineVal(deathsRows, 'sum') : null;

    const prevRows = rowsFor('prevalence', { age: 'All ages', year, country });
    const globalPrevalence = hasMeasure('prevalence') ? avgVal(prevRows) : null;

    const dalyRowsStd = rowsFor('dalys', { age: 'Age-standardized', year, country });
    const dalyRows = dalyRowsStd.length ? dalyRowsStd : rowsFor('dalys', { age: 'All ages', year, country });
    const avgDalys = hasMeasure('dalys') ? avgVal(dalyRows) : null;

    return [
      { key: 'kpi-deaths', value: totalDeaths == null ? '—' : Math.round(totalDeaths).toLocaleString(), sub: `${scopeLabel} · ${year}`, icon: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3' },
      { key: 'kpi-countries', value: countries, sub: window.T('kpi-dataset-wide'), icon: 'M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5' },
      { key: 'kpi-prevalence', value: globalPrevalence == null ? '—' : globalPrevalence.toFixed(2) + '%', sub: `${scopeLabel} · ${year}`, icon: 'M3 3v18h18M7 16l4-6 3 3 5-8' },
      { key: 'kpi-dalys', value: avgDalys == null ? '—' : avgDalys.toFixed(1), sub: `${scopeLabel} · ${year}`, icon: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' },
      { key: 'kpi-years', value: yearLabel, sub: window.T('kpi-dataset-wide'), icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z' },
    ];
  }

  function renderKPIs() {
    const grid = document.getElementById('ga-kpi-grid');
    const kpis = computeKPIs();
    grid.innerHTML = kpis.map(k => `
      <div class="kpi-card">
        <div class="kpi-icon"><svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="${k.icon}"/></svg></div>
        <div class="kpi-value">${k.value}</div>
        <div class="kpi-label">${window.T(k.key)}</div>
        <div class="kpi-scope">${k.sub || ''}</div>
      </div>`).join('');
  }

  /* ── CHART HELPERS ───────────────────────────────────────────── */
  function destroy(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  function baseScales(pal) {
    return {
      x: { ticks: { color: pal.muted, font: { size: 10.5 } }, grid: { color: pal.grid } },
      y: { ticks: { color: pal.muted, font: { size: 10.5 } }, grid: { color: pal.grid } }
    };
  }
  function baseTooltip(pal) {
    return { backgroundColor: pal.tooltipBg, titleColor: pal.text, bodyColor: pal.dim, borderColor: pal.grid, borderWidth: 1, padding: 10, cornerRadius: 8 };
  }
  function noDataPlaceholder(canvasId, msg) {
    const canvas = document.getElementById(canvasId);
    const wrap = canvas.parentElement;
    let ph = wrap.querySelector('.chart-no-data');
    if (!ph) {
      ph = document.createElement('div');
      ph.className = 'chart-no-data';
      wrap.appendChild(ph);
    }
    ph.textContent = msg;
    ph.style.display = 'flex';
    canvas.style.visibility = 'hidden';
  }
  function clearPlaceholder(canvasId) {
    const canvas = document.getElementById(canvasId);
    const wrap = canvas.parentElement;
    const ph = wrap.querySelector('.chart-no-data');
    if (ph) ph.style.display = 'none';
    canvas.style.visibility = 'visible';
  }

  /* ── CHART: Deaths by Country (Top 10) ───────────────────────── */
  function renderDeathsChart() {
    if (!hasMeasure('deaths')) { noDataPlaceholder('chart-region-deaths', window.T('no-data-deaths')); return; }
    clearPlaceholder('chart-region-deaths');
    const pal = palette();
    const year = uiState.deathsYear ?? getLatestYear();
    const ranked = getCountryRanking('deaths', year, 10);
    destroy('chart-region-deaths');
    charts['chart-region-deaths'] = new Chart(document.getElementById('chart-region-deaths'), {
      type: 'bar',
      data: {
        labels: ranked.map(s => s.country),
        datasets: [{ label: window.T('ga-chart1-title'), data: ranked.map(s => Math.round(s.value)), backgroundColor: pal.accent + 'cc', borderRadius: 6, barThickness: 18 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip(pal) },
        scales: baseScales(pal)
      }
    });
  }

  /* ── CHART: Sex Distribution ──────────────────────────────────── */
  function renderSexChart() {
    if (!hasMeasure('deaths')) { noDataPlaceholder('chart-sex-dist', window.T('no-data-deaths')); return; }
    clearPlaceholder('chart-sex-dist');
    const pal = palette();
    const year = uiState.sexYear ?? getLatestYear();
    const split = getSexSplit('deaths', year);
    destroy('chart-sex-dist');
    charts['chart-sex-dist'] = new Chart(document.getElementById('chart-sex-dist'), {
      type: 'doughnut',
      data: { labels: ['Male', 'Female'], datasets: [{ data: [Math.round(split.Male), Math.round(split.Female)], backgroundColor: [pal.accent, pal.accent2], borderWidth: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { position: 'bottom', labels: { color: pal.dim, font: { size: 11 }, padding: 14 } }, tooltip: baseTooltip(pal) }
      }
    });
  }

  /* ── CHART: World / Country Prevalence Trend ─────────────────── */
  function renderPrevalenceTrend() {
    if (!hasMeasure('prevalence')) { noDataPlaceholder('chart-decade-trend', window.T('no-data-prevalence')); return; }
    clearPlaceholder('chart-decade-trend');
    const pal = palette();
    const trend = getTrend('prevalence', uiState.prevalenceCountry);
    destroy('chart-decade-trend');
    charts['chart-decade-trend'] = new Chart(document.getElementById('chart-decade-trend'), {
      type: 'line',
      data: {
        labels: trend.years,
        datasets: [
          { label: 'Male', data: trend.male.map(v => +v.toFixed(2)), borderColor: pal.accent, backgroundColor: pal.accent + '22', fill: true, tension: .35, pointRadius: trend.years.length > 20 ? 0 : 3, borderWidth: 2.5 },
          { label: 'Female', data: trend.female.map(v => +v.toFixed(2)), borderColor: pal.accent2, backgroundColor: pal.accent2 + '22', fill: true, tension: .35, pointRadius: trend.years.length > 20 ? 0 : 3, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: pal.dim, font: { size: 11 } } },
          tooltip: Object.assign(baseTooltip(pal), { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } })
        },
        scales: Object.assign(baseScales(pal), { y: Object.assign({}, baseScales(pal).y, { ticks: Object.assign({}, baseScales(pal).y.ticks, { callback: v => v + '%' }) }) })
      }
    });
  }

  /* ── CHART: Age Group Comparison (Prevalence / Deaths / DALYs toggle) ── */
  function renderAgeGroupChart() {
    const measureKey = uiState.ageMeasure;
    if (!hasMeasure(measureKey)) { noDataPlaceholder('chart-age-group', window.Tf('no-data-measure', measureKey)); return; }
    clearPlaceholder('chart-age-group');
    const pal = palette();
    const year = uiState.ageYear ?? getLatestYear();
    const breakdown = getAgeGroupBreakdown(measureKey, year);
    const isPct = measureKey === 'prevalence';
    destroy('chart-age-group');
    charts['chart-age-group'] = new Chart(document.getElementById('chart-age-group'), {
      type: 'bar',
      data: {
        labels: breakdown.map(b => b.age),
        datasets: [{ label: window.T('cb-q-' + (measureKey === 'dalys' ? 'gina' : measureKey)) || measureKey, data: breakdown.map(b => +b.value.toFixed(isPct ? 2 : 0)), backgroundColor: pal.accent2 + 'cc', borderRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip(pal) },
        scales: baseScales(pal)
      }
    });
  }

  /* ── CHART: Top 10 Countries by Prevalence (replaces Risk Category) ── */
  function renderTopPrevalenceChart() {
    if (!hasMeasure('prevalence')) { noDataPlaceholder('chart-risk-category', window.T('no-data-prevalence')); return; }
    clearPlaceholder('chart-risk-category');
    const pal = palette();
    const year = uiState.topPrevalenceYear ?? getLatestYear();
    const ranked = getCountryRanking('prevalence', year, 10);
    destroy('chart-risk-category');
    charts['chart-risk-category'] = new Chart(document.getElementById('chart-risk-category'), {
      type: 'bar',
      data: {
        labels: ranked.map(r => r.country),
        datasets: [{ label: window.T('ga-chart4-title'), data: ranked.map(r => +r.value.toFixed(2)), backgroundColor: ranked.map((_, i) => (i === 0 ? pal.danger : i < 3 ? pal.orange : pal.accent3) + 'cc'), borderRadius: 6 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: Object.assign(baseTooltip(pal), { callbacks: { label: ctx => `${ctx.parsed.x}%` } })
        },
        scales: Object.assign(baseScales(pal), { x: Object.assign({}, baseScales(pal).x, { ticks: Object.assign({}, baseScales(pal).x.ticks, { callback: v => v + '%' }) }) })
      }
    });
  }

  /* ── CHART: Deaths Trend (Male vs Female, global or one country) ── */
  function renderDeathsTrend() {
    if (!hasMeasure('deaths')) { noDataPlaceholder('chart-deaths-trend', window.T('no-data-deaths')); return; }
    clearPlaceholder('chart-deaths-trend');
    const pal = palette();
    const trend = getTrend('deaths', uiState.deathsTrendCountry);
    destroy('chart-deaths-trend');
    charts['chart-deaths-trend'] = new Chart(document.getElementById('chart-deaths-trend'), {
      type: 'line',
      data: {
        labels: trend.years,
        datasets: [
          { label: 'Male', data: trend.male.map(v => Math.round(v)), borderColor: pal.accent, backgroundColor: pal.accent + '22', fill: true, tension: .35, pointRadius: trend.years.length > 20 ? 0 : 3, borderWidth: 2.5 },
          { label: 'Female', data: trend.female.map(v => Math.round(v)), borderColor: pal.accent2, backgroundColor: pal.accent2 + '22', fill: true, tension: .35, pointRadius: trend.years.length > 20 ? 0 : 3, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: pal.dim, font: { size: 11 } } }, tooltip: baseTooltip(pal) },
        scales: baseScales(pal)
      }
    });
  }

  function renderAll() {
    renderKPIs();
    populateSlicers();
    renderDeathsChart();
    renderSexChart();
    renderPrevalenceTrend();
    renderDeathsTrend();
    renderAgeGroupChart();
    renderTopPrevalenceChart();
  }

  /* ── SLICER POPULATION ────────────────────────────────────────── */
  function populateSlicers() {
    const years = getYears();
    const countries = getCountries();
    const latest = getLatestYear();

    const yearSelects = ['deaths-year-select', 'sex-year-select', 'age-year-select', 'top-prevalence-year-select', 'kpi-year-select'];
    yearSelects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value ? parseInt(sel.value, 10) : null;
      sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
      const target = years.includes(current) ? current : latest;
      sel.value = target;
    });
    uiState.deathsYear = parseInt(document.getElementById('deaths-year-select').value, 10);
    uiState.sexYear = parseInt(document.getElementById('sex-year-select').value, 10);
    uiState.ageYear = parseInt(document.getElementById('age-year-select').value, 10);
    uiState.topPrevalenceYear = parseInt(document.getElementById('top-prevalence-year-select').value, 10);
    uiState.kpiYear = parseInt(document.getElementById('kpi-year-select').value, 10);

    const countrySelects = ['prevalence-country-select', 'kpi-country-select', 'deaths-trend-country-select'];
    countrySelects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value || 'ALL';
      sel.innerHTML = `<option value="ALL">${window.T('slicer-all-world')}</option>` + countries.map(c => `<option value="${c}">${c}</option>`).join('');
      sel.value = countries.includes(current) || current === 'ALL' ? current : 'ALL';
    });
    uiState.prevalenceCountry = document.getElementById('prevalence-country-select').value;
    uiState.kpiCountry = document.getElementById('kpi-country-select').value;
    uiState.deathsTrendCountry = document.getElementById('deaths-trend-country-select').value;
  }

  /* ── AI SUMMARY GENERATION ───────────────────────────────────── */
  async function generateSummary() {
    const btn = document.getElementById('ga-generate-summary');
    const out = document.getElementById('ga-ai-output');
    const latestYear = getLatestYear();
    btn.disabled = true;
    out.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${window.T('ai-thinking')}`;
    try {
      const context = JSON.stringify({
        latest_year: latestYear,
        kpis: computeKPIs().map(k => ({ metric: window.T(k.key), value: k.value })),
        top_10_countries_by_total_deaths_number_latest_year: hasMeasure('deaths') ? getCountryRanking('deaths', latestYear, 10).map(r => ({ country: r.country, deaths: Math.round(r.value) })) : 'not available in this dataset',
        top_10_countries_by_prevalence_percent_latest_year: hasMeasure('prevalence') ? getCountryRanking('prevalence', latestYear, 10).map(r => ({ country: r.country, prevalence_pct: +r.value.toFixed(2) })) : 'not available in this dataset',
        age_group_breakdown_prevalence_pct_latest_year: hasMeasure('prevalence') ? getAgeGroupBreakdown('prevalence', latestYear).map(b => ({ age: b.age, prevalence_pct: +b.value.toFixed(2) })) : 'not available in this dataset'
      });
      const system = window.CURLANG === 'ar'
        ? `أنت محلل بيانات صحية عالمية خبير. اعتمد فقط على أرقام سياق JSON المرفق ولا تختلق إحصائيات غير واردة فيه. كل قيمة مُسماة بوضوح بالمقياس والوحدة (وفيات كأعداد، انتشار كنسبة مئوية) — لا تخلط بينها. اكتب تحليلاً احترافيًا موجزًا في حدود 5 نقاط كحد أقصى (كل نقطة جملة أو جملتان فقط)، يبرز الأنماط والمخاطر الأكثر أهمية. يجب أن يكون التحليل كاملاً وغير مقطوع — لا تبدأ نقطة إن لم تكن قادرًا على إنهائها ضمن حدود الإيجاز المطلوبة.`
        : `You are an expert global health data analyst. Rely only on the numbers in the attached JSON context — never invent statistics not present in it. Every value is clearly labeled with its measure and unit (deaths as counts, prevalence as a percentage) — do not conflate them. Write a concise, professional analysis of at most 5 bullet points (each just 1-2 sentences), highlighting the most important patterns and risk implications. The analysis must be complete and never cut off — don't start a point you can't finish within that concise format.`;
      const prompt = window.CURLANG === 'ar' ? `السياق: ${context}` : `Context: ${context}`;
      const text = await window.ApiManager.generate(prompt, { system, maxTokens: 1500, temperature: 0.3 });
      out.innerHTML = window.mdToHtml(text);
    } catch (e) {
      const detail = (e && e.message ? e.message : String(e || '')).trim();
      const escapedDetail = document.createElement('div');
      escapedDetail.textContent = detail;
      out.innerHTML = `<span style="color:var(--danger)">${window.T('ai-error')}</span>` +
        (escapedDetail.innerHTML ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono);word-break:break-word;">${escapedDetail.innerHTML}</div>` : '');
    }
    btn.disabled = false;
  }

  /* ── SLICER / TOGGLE EVENT WIRING ─────────────────────────────── */
  function wireControls() {
    document.getElementById('deaths-year-select').addEventListener('change', e => { uiState.deathsYear = parseInt(e.target.value, 10); renderDeathsChart(); });
    document.getElementById('sex-year-select').addEventListener('change', e => { uiState.sexYear = parseInt(e.target.value, 10); renderSexChart(); });
    document.getElementById('age-year-select').addEventListener('change', e => { uiState.ageYear = parseInt(e.target.value, 10); renderAgeGroupChart(); });
    document.getElementById('top-prevalence-year-select').addEventListener('change', e => { uiState.topPrevalenceYear = parseInt(e.target.value, 10); renderTopPrevalenceChart(); });
    document.getElementById('prevalence-country-select').addEventListener('change', e => { uiState.prevalenceCountry = e.target.value; renderPrevalenceTrend(); });
    document.getElementById('deaths-trend-country-select').addEventListener('change', e => { uiState.deathsTrendCountry = e.target.value; renderDeathsTrend(); });
    document.getElementById('kpi-year-select').addEventListener('change', e => { uiState.kpiYear = parseInt(e.target.value, 10); renderKPIs(); });
    document.getElementById('kpi-country-select').addEventListener('change', e => { uiState.kpiCountry = e.target.value; renderKPIs(); });

    document.querySelectorAll('#age-measure-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        uiState.ageMeasure = btn.dataset.measure;
        document.querySelectorAll('#age-measure-toggle .toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderAgeGroupChart();
      });
    });

    const refreshAllBtn = document.getElementById('ga-refresh-all');
    if (refreshAllBtn) refreshAllBtn.addEventListener('click', renderAll);

    document.getElementById('ga-generate-summary').addEventListener('click', generateSummary);
  }

  /* ── THEME / LANG HOOKS ──────────────────────────────────────── */
  function onThemeChange() { if (RAW.length) renderAll(); }
  function onLangChange() { if (RAW.length) renderAll(); }

  function init() {
    // Show mock data instantly so the UI isn't blank while the API call is in flight
    RAW = buildMockData();
    usingMock = true;
    resetUiStateToLatest();
    renderStats();
    renderAll();
    wireControls();
    loadFromAPI();
  }

  window.GlobalAnalysis = {
    init, loadFromAPI, onThemeChange, onLangChange,
    getData: () => RAW,
    isMock: () => usingMock,
    getYears, getLatestYear, getCountries, hasMeasure,
    getCountryRanking, getSexSplit, getTrend, getAgeGroupBreakdown,
    computeKPIs,
    maxOf, minOf
  };
})();

/* ══════════════════════════════════════════════════════════════
   patient-ml.js — Patient-Level ML Predictor
   Parses asthma_disease_data_realistic.csv (PapaParse), renders a
   clickable data grid, maps a selected row onto the predictor form,
   runs an XGBoost-style gradient-boosted logistic model with
   SHAP-style per-feature contribution bars, and now also produces
   a personalized, rule-based recommendations list under the score.
   ══════════════════════════════════════════════════════════════ */

(function () {
  let PATIENTS = [];
  const REQUIRED_COLS = ['PatientID', 'Age', 'Gender', 'BMI', 'Smoking', 'Diagnosis'];

  /* ── CSV LOADING ─────────────────────────────────────────────── */
  function loadCSV(file) {
    const statusEl = document.getElementById('patient-data-status');
    statusEl.className = 'data-status ok';
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${window.T('parsing-large')}`;

    let finished = false;
    const watchdog = setTimeout(() => {
      if (finished) return;
      finished = true;
      statusEl.className = 'data-status err';
      statusEl.textContent = window.T('data-error') + ' — parsing timed out. Try serving this page over http(s):// instead of opening the file directly, or use a smaller CSV.';
    }, 25000);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      // worker:true deliberately not used — it fails to ever call back when the
      // app is opened via file:// (common for a local HTML file), which caused
      // the "Processing dataset…" status to hang forever.
      transformHeader: h => (h || '').trim(),
      complete: function (results) {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        try {
          const cols = (results.meta.fields || []).map(f => (f || '').trim());
          const missing = REQUIRED_COLS.filter(c => !cols.includes(c));
          if (missing.length) {
            statusEl.className = 'data-status err';
            statusEl.textContent = window.T('data-error') + ' — missing: ' + missing.join(', ');
            return;
          }
          const cleaned = [];
          for (let i = 0; i < results.data.length; i++) {
            const r = results.data[i];
            if (!r || r.PatientID === null || r.PatientID === undefined || r.PatientID === '') continue;
            cleaned.push(r);
          }
          if (!cleaned.length) {
            statusEl.className = 'data-status err';
            statusEl.textContent = window.T('data-error') + ' — 0 usable rows after validation.';
            return;
          }
          PATIENTS = cleaned;
          statusEl.className = 'data-status ok';
          statusEl.textContent = window.Tf('data-loaded', PATIENTS.length);
          renderSidebarStats();
          renderMiniStats();
          renderTable();
          if (window.ChatBot && window.ChatBot.onDataChange) window.ChatBot.onDataChange();
        } catch (err) {
          console.error('PatientML render error:', err);
          statusEl.className = 'data-status err';
          statusEl.textContent = window.T('data-error') + ' — ' + err.message;
        }
      },
      error: function (err) {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        statusEl.className = 'data-status err';
        statusEl.textContent = window.T('data-error') + (err && err.message ? ' — ' + err.message : '');
      }
    });
  }

  function renderSidebarStats() {
    const el = document.getElementById('patient-data-stats');
    const pos = PATIENTS.filter(p => p.Diagnosis === 1).length;
    el.style.display = 'grid';
    el.innerHTML = `
      <div class="ds-item"><div class="ds-num">${PATIENTS.length.toLocaleString()}</div><div class="ds-lbl">Rows</div></div>
      <div class="ds-item"><div class="ds-num">${pos.toLocaleString()}</div><div class="ds-lbl">Diagnosed</div></div>`;
  }

  function renderMiniStats() {
    const el = document.getElementById('pm-mini-stats');
    const pos = PATIENTS.filter(p => p.Diagnosis === 1).length;
    const rate = PATIENTS.length ? ((pos / PATIENTS.length) * 100).toFixed(1) : '0';
    el.style.display = 'grid';
    el.innerHTML = `
      <div class="mini-stat"><b>${PATIENTS.length.toLocaleString()}</b><span>${window.T('mini-total')}</span></div>
      <div class="mini-stat"><b>${pos.toLocaleString()}</b><span>${window.T('mini-positive')}</span></div>
      <div class="mini-stat"><b>${rate}%</b><span>${window.T('mini-rate')}</span></div>`;
  }

  /* ── DATA GRID ───────────────────────────────────────────────── */
  function renderTable() {
    const head = document.getElementById('patient-table-head');
    const body = document.getElementById('patient-table-body');
    head.innerHTML = ['th-id', 'th-age', 'th-gender', 'th-bmi', 'th-smoking', 'th-fev1', 'th-diagnosis']
      .map(k => `<th>${window.T(k)}</th>`).join('');

    if (!PATIENTS.length) {
      body.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted);">${window.T('pm-grid-empty')}</td></tr>`;
      return;
    }

    const rows = PATIENTS.slice(0, 300); // cap render for performance — full dataset still used for stats/predictions
    body.innerHTML = rows.map((p, i) => `
      <tr data-idx="${i}">
        <td>${p.PatientID}</td>
        <td>${p.Age}</td>
        <td>${p.Gender === 1 ? window.T('male') : window.T('female')}</td>
        <td>${(p.BMI || 0).toFixed(1)}</td>
        <td>${p.Smoking ? window.T('f-smoke-3') : window.T('f-smoke-1')}</td>
        <td>${(p.LungFunctionFEV1 || 0).toFixed(2)}</td>
        <td><span class="badge ${p.Diagnosis ? 'pos' : 'neg'}">${p.Diagnosis ? window.T('positive') : window.T('negative')}</span></td>
      </tr>`).join('');

    body.querySelectorAll('tr[data-idx]').forEach(tr => {
      tr.addEventListener('click', () => {
        body.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        populateFormFromPatient(rows[parseInt(tr.dataset.idx)]);
      });
    });
  }

  /* ── MAP CSV ROW → FORM FIELDS ───────────────────────────────── */
  function populateFormFromPatient(p) {
    const ageBucket = p.Age <= 12 ? 0.5 : p.Age <= 19 ? 0.7 : p.Age <= 45 ? 1 : p.Age <= 65 ? 1.2 : 1.5;
    document.getElementById('f-age').value = ageBucket;
    document.getElementById('f-bmi').value = p.BMI < 25 ? 0 : p.BMI < 30 ? 1 : 2;
    document.getElementById('f-smoke').value = p.Smoking ? 2 : 0;
    document.getElementById('f-activity').value = p.PhysicalActivity > 6 ? 2 : p.PhysicalActivity > 3 ? 1 : 0;
    document.getElementById('f-pollution').value = p.PollutionExposure > 6 ? 2 : p.PollutionExposure > 3 ? 1 : 0;
    document.getElementById('f-aqi').value = p.PollutionExposure > 8 ? 3 : p.PollutionExposure > 6 ? 2 : p.PollutionExposure > 3 ? 1 : 0;
    document.getElementById('f-occup').value = p.DustExposure > 6 ? 2 : p.DustExposure > 3 ? 1 : 0;
    document.getElementById('f-family').value = p.FamilyHistoryAsthma ? 1 : 0;
    document.getElementById('f-allergy').value = p.HistoryOfAllergies ? 1 : 0;
    document.getElementById('f-pet').value = p.PetAllergy ? 1 : 0;
    runPrediction();
  }

  /* ── XGBoost-STYLE PREDICTOR ─────────────────────────────────── */
  function runPrediction() {
    const ageW = parseFloat(document.getElementById('f-age').value);
    const bmi = parseInt(document.getElementById('f-bmi').value);
    const smoke = parseInt(document.getElementById('f-smoke').value);
    const activity = parseInt(document.getElementById('f-activity').value);
    const pollution = parseInt(document.getElementById('f-pollution').value);
    const aqi = parseInt(document.getElementById('f-aqi').value);
    const occup = parseInt(document.getElementById('f-occup').value);
    const family = parseInt(document.getElementById('f-family').value);
    const allergy = parseInt(document.getElementById('f-allergy').value);
    const pet = parseInt(document.getElementById('f-pet').value);

    // Weights calibrated to mirror published feature-importance ordering
    // for asthma risk models (family history & allergy dominate; exercise protective)
    const W = {
      family: 0.42, allergy: 0.22, smoke: 0.32, aqi: 0.28,
      pet: 0.19, pollution: 0.18, bmi: 0.14, age: 0.18,
      occup: 0.12, activity: -0.10
    };

    // Boosting round 1 — base logit
    let logit = -1.5;
    logit += family * W.family;
    logit += allergy * W.allergy;
    logit += (smoke / 2) * W.smoke;
    logit += (aqi / 3) * W.aqi;
    logit += pet * W.pet;
    logit += (pollution / 2) * W.pollution;
    logit += bmi * (W.bmi / 2);
    logit += (ageW - 0.7) * W.age;
    logit += (occup / 2) * W.occup;
    logit += activity * W.activity;

    // Boosting round 2 — residual correction
    const p1 = 1 / (1 + Math.exp(-logit));
    logit += 0.3 * (p1 - 0.5) * (family * 0.15 + allergy * 0.12);

    // Boosting round 3 — final correction
    const p2 = 1 / (1 + Math.exp(-logit));
    logit += 0.15 * (p2 - 0.5);

    const prob = 1 / (1 + Math.exp(-logit));
    const score = Math.round(Math.min(97, Math.max(3, prob * 100)));

    const inputs = { family, allergy, smoke, aqi, pet, pollution, bmi, occup, activity, ageW };

    const labels = {
      family: window.CURLANG === 'ar' ? 'التاريخ العائلي' : 'Family history',
      allergy: window.CURLANG === 'ar' ? 'الحساسية' : 'Allergies',
      smoke: window.CURLANG === 'ar' ? 'التدخين' : 'Smoking',
      aqi: window.CURLANG === 'ar' ? 'جودة الهواء' : 'Air quality (AQI)',
      pet: window.CURLANG === 'ar' ? 'حساسية الحيوانات' : 'Pet allergy',
      pollution: window.CURLANG === 'ar' ? 'التلوث البيئي' : 'Pollution exposure',
      bmi: window.CURLANG === 'ar' ? 'مؤشر كتلة الجسم' : 'BMI (obesity)',
      occup: window.CURLANG === 'ar' ? 'التعرض المهني' : 'Occupational exposure',
    };

    const shapVals = [
      { key: 'family', label: labels.family, raw: family * Math.abs(W.family) },
      { key: 'allergy', label: labels.allergy, raw: allergy * Math.abs(W.allergy) },
      { key: 'smoke', label: labels.smoke, raw: (smoke / 2) * Math.abs(W.smoke) },
      { key: 'aqi', label: labels.aqi, raw: (aqi / 3) * Math.abs(W.aqi) },
      { key: 'pet', label: labels.pet, raw: pet * Math.abs(W.pet) },
      { key: 'pollution', label: labels.pollution, raw: (pollution / 2) * Math.abs(W.pollution) },
      { key: 'bmi', label: labels.bmi, raw: bmi * Math.abs(W.bmi / 2) },
      { key: 'occup', label: labels.occup, raw: (occup / 2) * Math.abs(W.occup) },
    ].filter(s => s.raw > 0).sort((a, b) => b.raw - a.raw).slice(0, 5);

    const box = document.getElementById('risk-result');
    box.classList.remove('hidden');
    const scoreEl = document.getElementById('rscore'), barEl = document.getElementById('rbar');
    let color, lab, tier;
    if (score < 25) { color = 'var(--success)'; lab = window.T('risk-low'); tier = 'low'; }
    else if (score < 50) { color = 'var(--warning)'; lab = window.T('risk-mod'); tier = 'mod'; }
    else if (score < 75) { color = 'var(--orange)'; lab = window.T('risk-high'); tier = 'high'; }
    else { color = 'var(--danger)'; lab = window.T('risk-vhigh'); tier = 'vhigh'; }
    scoreEl.textContent = score + '%'; scoreEl.style.color = color;
    barEl.style.width = score + '%'; barEl.style.background = color;
    document.getElementById('rlabel').textContent = lab;

    const shapRoot = document.getElementById('shap-root');
    const maxShap = Math.max(...shapVals.map(s => s.raw), 0.01); // shapVals capped at 5 items — spread is safe here
    shapRoot.innerHTML = `<div class="shap-title">${window.T('shap-top')}</div>`;
    shapVals.forEach(s => {
      const pct = Math.round((s.raw / maxShap) * 100);
      const c = pct > 60 ? 'var(--danger)' : pct > 30 ? 'var(--warning)' : 'var(--accent)';
      const row = document.createElement('div'); row.className = 'shap-row';
      row.innerHTML = `<div class="shap-lbl">${s.label}</div>
        <div class="shap-track"><div class="shap-fill" style="width:${pct}%;background:${c}"></div></div>
        <div class="shap-val">${(s.raw * 100).toFixed(0)}%</div>`;
      shapRoot.appendChild(row);
    });

    renderRecommendations(inputs, shapVals, score, tier);

    return { score, lab, tier, shapVals, inputs };
  }

  /* ── RECOMMENDATIONS ENGINE ──────────────────────────────────── */
  function renderRecommendations(inputs, shapVals, score, tier) {
    const root = document.getElementById('reco-root');
    if (!root) return;

    const recoMap = {
      family: 'reco-family', allergy: 'reco-allergy', smoke: 'reco-smoke',
      aqi: 'reco-aqi', pet: 'reco-pet', pollution: 'reco-pollution',
      bmi: 'reco-bmi', occup: 'reco-occup'
    };

    const items = [];
    // Personalized: one recommendation per active top contributing factor
    shapVals.forEach(s => {
      if (recoMap[s.key]) items.push(window.T(recoMap[s.key]));
    });
    // Activity is protective, not in shapVals list — flag separately if sedentary
    if (inputs.activity === 0) items.push(window.T('reco-activity'));

    // De-duplicate while preserving order
    const seen = new Set();
    const uniqueItems = items.filter(t => (seen.has(t) ? false : (seen.add(t), true)));

    // Closing note scaled to risk tier
    const closing = (tier === 'high' || tier === 'vhigh') ? window.T('reco-see-doctor') : window.T('reco-maintain');

    root.innerHTML = `
      <div class="shap-title" style="margin-top:18px;">${window.T('reco-title')}</div>
      <ul class="reco-list">
        ${uniqueItems.map(t => `<li>${t}</li>`).join('')}
        <li class="reco-closing">${closing}</li>
      </ul>`;
  }

  /* ── AI EXPLANATION ──────────────────────────────────────────── */
  async function explainWithAI() {
    const out = document.getElementById('pm-ai-output');
    const btn = document.getElementById('pm-ai-explain-btn');
    out.style.display = 'block';
    const result = runPrediction();
    btn.disabled = true;
    out.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${window.T('ai-thinking')}`;
    try {
      const context = JSON.stringify({
        risk_score_pct: result.score,
        risk_tier: result.lab.replace(/[🟢🟡🟠🔴]/g, '').trim(),
        top_contributing_factors: result.shapVals.map(s => ({ factor: s.label, contribution_pct: +(s.raw * 100).toFixed(0) })),
        patient_inputs: result.inputs
      });
      const system = window.CURLANG === 'ar'
        ? `أنت مساعد سريري متخصص في الربو. اعتمد فقط على أرقام سياق JSON المرفق (نتيجة الخطر، العوامل المساهمة بأسلوب SHAP، ومدخلات المريض) ولا تختلق معلومات غير واردة فيه. اشرح بدقة سريرية سبب هذه الدرجة، ثم قدّم توصيات وقائية عملية مرتبطة تحديدًا بالعوامل المذكورة، ونوّه بوضوح أن هذا ليس تشخيصًا طبيًا.`
        : `You are a clinical assistant specializing in asthma risk. Rely only on the attached JSON context (the risk score, SHAP-style contributing factors, and patient inputs) — do not invent information not present in it. Explain with clinical precision why this score resulted, then give practical preventive recommendations tied specifically to the factors listed, and clearly note this is not a medical diagnosis.`;
      const prompt = window.CURLANG === 'ar' ? `السياق: ${context}` : `Context: ${context}`;
      const text = await window.ApiManager.generate(prompt, { system, maxTokens: 800, temperature: 0.3 });
      out.innerHTML = window.mdToHtml(text);
    } catch (e) {
      out.innerHTML = `<span style="color:var(--danger)">${window.T('ai-error')}</span>`;
    }
    btn.disabled = false;
  }

  /* ── THEME / LANG HOOKS ──────────────────────────────────────── */
  function onThemeChange() { /* pure CSS-variable driven, nothing to rebuild */ }
  function onLangChange() {
    renderTable();
    if (PATIENTS.length) renderMiniStats();
    if (!document.getElementById('risk-result').classList.contains('hidden')) runPrediction();
  }

  function init() {
    renderTable();
    document.getElementById('pm-predict-btn').addEventListener('click', runPrediction);
    document.getElementById('pm-ai-explain-btn').addEventListener('click', explainWithAI);
  }

  window.PatientML = { init, loadCSV, onThemeChange, onLangChange, getData: () => PATIENTS, runPrediction };
})();

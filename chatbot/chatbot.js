/* ══════════════════════════════════════════════════════════════
   chatbot.js — "Ask AsthmAI" data-grounded chat assistant
   REBUILT: every quick-question now calls the SAME schema-correct
   helper functions the dashboard uses (window.GlobalAnalysis.get*),
   instead of re-deriving its own aggregation (which had previously
   reintroduced the double-counting / val-vs-val_display bugs).
   No decade / risk_category columns are referenced anywhere here.
   ══════════════════════════════════════════════════════════════ */

(function () {
  let msgSeq = 0;

  /* ── QUICK QUESTION DEFINITIONS ──────────────────────────────── */
  const QUESTIONS = [
    { id: 'what',        emoji: '❓', key: 'cb-q-what',        handler: answerWhatIsAsthma },
    { id: 'region',      emoji: '📊', key: 'cb-q-region',      handler: answerPrevalenceByRegion },
    { id: 'deaths',      emoji: '📈', key: 'cb-q-deaths',      handler: answerDeathsTrend },
    { id: 'top10',       emoji: '🌍', key: 'cb-q-top10',       handler: answerTop10 },
    { id: 'riskfactors', emoji: '⚠️', key: 'cb-q-riskfactors', handler: answerRiskFactors },
    { id: 'sex',         emoji: '⚥',  key: 'cb-q-sex',         handler: answerSexSplit },
    { id: 'mena',        emoji: '🌐', key: 'cb-q-mena',        handler: answerMena },
    { id: 'prevention',  emoji: '🛡️', key: 'cb-q-prevention',  handler: answerPreventionTips },
    { id: 'country',     emoji: '🇪🇬', key: 'cb-q-country',     handler: answerCountryPrompt },
    { id: 'gina',        emoji: '🚦', key: 'cb-q-gina',        handler: answerGina },
  ];

  const MENA_AFRICA = ['Egypt','Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Bahrain','Oman','Jordan','Lebanon','Iraq','Syria','Yemen','Libya','Tunisia','Algeria','Morocco','Sudan','Israel','Palestine','Nigeria','Ethiopia','Kenya','South Africa','Ghana','Uganda','Tanzania','Democratic Republic of the Congo','Angola','Mozambique','Cameroon','Ivory Coast', "Côte d'Ivoire", 'Senegal','Zambia','Zimbabwe','Somalia'];

  /* ── SHORTCUTS TO THE SHARED, SCHEMA-CORRECT DATA API ────────── */
  function GA() { return window.GlobalAnalysis; }
  function pm() { return (window.PatientML && window.PatientML.getData()) || []; }
  function isAr() { return window.CURLANG === 'ar'; }
  function md(s) { return window.mdToHtml(s); }

  /* ── CHART BUBBLE HELPER ─────────────────────────────────────── */
  function pal() {
    const cs = getComputedStyle(document.body);
    return {
      accent: cs.getPropertyValue('--accent').trim() || '#22d3ee',
      accent2: cs.getPropertyValue('--accent-2').trim() || '#818cf8',
      accent3: cs.getPropertyValue('--accent-3').trim() || '#34d399',
      danger: cs.getPropertyValue('--danger').trim() || '#f87171',
      warning: cs.getPropertyValue('--warning').trim() || '#fbbf24',
      dim: cs.getPropertyValue('--text-dim').trim() || '#9fb0cc',
      muted: cs.getPropertyValue('--chart-tick').trim() || '#6b7ea3',
      grid: cs.getPropertyValue('--chart-grid').trim() || 'rgba(159,176,204,.1)',
      tooltipBg: cs.getPropertyValue('--chart-tooltip-bg').trim() || '#1c2740',
    };
  }

  function renderBubbleChart(canvas, type, labels, datasets, horizontal) {
    const p = pal();
    return new Chart(canvas, {
      type,
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: datasets.length > 1, position: 'bottom', labels: { color: p.dim, font: { size: 10.5 } } },
          tooltip: { backgroundColor: p.tooltipBg, titleColor: '#fff', bodyColor: p.dim, borderColor: p.grid, borderWidth: 1, padding: 8, cornerRadius: 6 }
        },
        scales: type === 'doughnut' || type === 'polarArea' ? {} : {
          x: { ticks: { color: p.muted, font: { size: 10 } }, grid: { color: p.grid } },
          y: { ticks: { color: p.muted, font: { size: 10 } }, grid: { color: p.grid } }
        }
      }
    });
  }

  /* ── MESSAGE RENDERING ────────────────────────────────────────── */
  function scrollToBottom() {
    const box = document.getElementById('cb-messages');
    box.scrollTop = box.scrollHeight;
  }

  function appendUserMessage(text) {
    const box = document.getElementById('cb-messages');
    const div = document.createElement('div');
    div.className = 'cb-msg user';
    const safe = document.createElement('div'); safe.textContent = text;
    div.innerHTML = `<div class="cb-avatar">🙂</div><div class="cb-bubble">${safe.innerHTML}</div>`;
    box.appendChild(div);
    scrollToBottom();
  }

  function appendBotMessage(bodyHtml, chartSpec) {
    const box = document.getElementById('cb-messages');
    const id = 'cb-chart-' + (msgSeq++);
    const div = document.createElement('div');
    div.className = 'cb-msg bot';
    div.innerHTML = `<div class="cb-avatar">🫁</div><div class="cb-bubble">${bodyHtml}${chartSpec ? `<div class="cb-chart-wrap"><canvas id="${id}"></canvas></div>` : ''}</div>`;
    box.appendChild(div);
    if (chartSpec) {
      const canvas = document.getElementById(id);
      renderBubbleChart(canvas, chartSpec.type, chartSpec.labels, chartSpec.datasets, chartSpec.horizontal);
    }
    scrollToBottom();
    return div;
  }

  function appendTypingMessage() {
    const box = document.getElementById('cb-messages');
    const div = document.createElement('div');
    div.className = 'cb-msg bot';
    div.id = 'cb-typing-msg';
    div.innerHTML = `<div class="cb-avatar">🫁</div><div class="cb-bubble"><span class="typing-dots"><span></span><span></span><span></span></span> ${window.T('cb-thinking')}</div>`;
    box.appendChild(div);
    scrollToBottom();
    return div;
  }

  function escapeHtml(s) {
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  function noDataMsg(measureLabel) {
    return isAr()
      ? `لا توجد صفوف <b>${measureLabel}</b> في البيانات المحمّلة حاليًا لعرضها.`
      : `There are no <b>${measureLabel}</b> rows in the currently loaded dataset to show.`;
  }

  /* ── ANSWER BUILDERS (each grounded in the shared data API) ──── */
  function answerWhatIsAsthma() {
    const rows = GA().getData();
    const countries = GA().getCountries().length;
    const body = isAr()
      ? `<b>الربو</b> هو مرض التهابي مزمن في مجرى الهواء يسبب أزيزًا وضيق تنفس وسعالًا وشعورًا بضيق الصدر، وينتج عن فرط استجابة الشعب الهوائية لمحفزات مثل المسببات الحساسية والتلوث والعدوى.<br><br>
        هذه المنصة تحلل حاليًا <b>${rows.length.toLocaleString()}</b> سجل عبر <b>${countries}</b> دولة من بيانات العبء العالمي للأمراض (GBD).`
      : `<b>Asthma</b> is a chronic inflammatory airway disease causing wheezing, shortness of breath, coughing, and chest tightness, driven by airway hyper-responsiveness to triggers like allergens, pollution, and infections.<br><br>
        This platform is currently analyzing <b>${rows.length.toLocaleString()}</b> records across <b>${countries}</b> countries from the Global Burden of Disease (GBD) dataset.`;
    appendBotMessage(body);
  }

  function answerPrevalenceByRegion() {
    if (!GA().hasMeasure('prevalence')) { appendBotMessage(noDataMsg(isAr() ? 'الانتشار (Prevalence)' : 'Prevalence')); return; }
    const year = GA().getLatestYear();
    const ranked = GA().getCountryRanking('prevalence', year, 10);
    if (!ranked.length) { appendBotMessage(noDataMsg('Prevalence')); return; }
    const listHtml = ranked.map(r => `<li><b>${r.country}</b> — ${r.value.toFixed(2)}%</li>`).join('');
    const body = isAr()
      ? `أعلى 10 دول من حيث نسبة انتشار الربو لعام <b>${year}</b>:<ol>${listHtml}</ol>`
      : `Top 10 countries by asthma prevalence rate in <b>${year}</b>:<ol>${listHtml}</ol>`;
    appendBotMessage(body, {
      type: 'bar', horizontal: true,
      labels: ranked.map(r => r.country),
      datasets: [{ data: ranked.map(r => +r.value.toFixed(2)), backgroundColor: pal().accent + 'cc', borderRadius: 5 }]
    });
  }

  function answerDeathsTrend() {
    if (!GA().hasMeasure('deaths')) { appendBotMessage(noDataMsg(isAr() ? 'الوفيات (Deaths)' : 'Deaths')); return; }
    const trend = GA().getTrend('deaths', 'ALL');
    if (!trend.years.length) { appendBotMessage(noDataMsg('Deaths')); return; }
    const totalByYear = trend.years.map((y, i) => trend.male[i] + trend.female[i]);
    const first = totalByYear[0], last = totalByYear[totalByYear.length - 1];
    const pctChange = first ? (((last - first) / first) * 100).toFixed(1) : '0';
    const direction = last >= first ? (isAr() ? 'ارتفاعًا' : 'an increase') : (isAr() ? 'انخفاضًا' : 'a decrease');
    const body = isAr()
      ? `يُظهر إجمالي الوفيات العالمية (كل الدول، جميع الأعمار) ${direction} بنسبة <b>${Math.abs(pctChange)}%</b> من ${trend.years[0]} إلى ${trend.years[trend.years.length - 1]}، من ${Math.round(first).toLocaleString()} إلى ${Math.round(last).toLocaleString()} حالة وفاة سنويًا.`
      : `Total global deaths (all countries, all ages) show ${direction} of <b>${Math.abs(pctChange)}%</b> from ${trend.years[0]} to ${trend.years[trend.years.length - 1]}, moving from ${Math.round(first).toLocaleString()} to ${Math.round(last).toLocaleString()} annual deaths.`;
    appendBotMessage(body, {
      type: 'line',
      labels: trend.years,
      datasets: [{ label: isAr() ? 'الإجمالي' : 'Total', data: totalByYear.map(v => Math.round(v)), borderColor: pal().accent, backgroundColor: pal().accent + '33', fill: true, tension: .35, pointRadius: trend.years.length > 15 ? 0 : 3 }]
    });
  }

  function answerTop10() {
    if (!GA().hasMeasure('deaths')) { appendBotMessage(noDataMsg(isAr() ? 'الوفيات (Deaths)' : 'Deaths')); return; }
    const year = GA().getLatestYear();
    const ranked = GA().getCountryRanking('deaths', year, 10);
    if (!ranked.length) { appendBotMessage(noDataMsg('Deaths')); return; }
    const grandTotal = ranked.reduce((s, r) => s + r.value, 0) + 0.0001;
    const listHtml = ranked.map((r, i) => `<li>${i + 1}. <b>${r.country}</b>: ${Math.round(r.value).toLocaleString()} ${isAr() ? 'وفاة' : 'deaths'}</li>`).join('');
    const body = isAr()
      ? `أعلى 10 دول من حيث إجمالي الوفيات (جميع الأعمار، كل الجنسين) في <b>${year}</b>:<ol>${listHtml}</ol>`
      : `Top 10 countries by total deaths (all ages, both sexes) in <b>${year}</b>:<ol>${listHtml}</ol>`;
    appendBotMessage(body, {
      type: 'bar', horizontal: true,
      labels: ranked.map(r => r.country),
      datasets: [{ data: ranked.map(r => Math.round(r.value)), backgroundColor: pal().accent2 + 'cc', borderRadius: 5 }]
    });
  }

  function answerRiskFactors() {
    const patients = pm();
    if (patients.length) {
      const n = patients.length;
      const pct = arr => ((arr.filter(Boolean).length / n) * 100).toFixed(1);
      const stats = [
        { label: isAr() ? 'التاريخ العائلي' : 'Family history', v: pct(patients.map(p => p.FamilyHistoryAsthma)) },
        { label: isAr() ? 'التدخين' : 'Smoking', v: pct(patients.map(p => p.Smoking)) },
        { label: isAr() ? 'تاريخ الحساسية' : 'History of allergies', v: pct(patients.map(p => p.HistoryOfAllergies)) },
        { label: isAr() ? 'حساسية الحيوانات' : 'Pet allergy', v: pct(patients.map(p => p.PetAllergy)) },
        { label: isAr() ? 'تعرض عالٍ للتلوث' : 'High pollution exposure', v: pct(patients.map(p => (p.PollutionExposure || 0) > 6)) },
      ].sort((a, b) => b.v - a.v);
      const listHtml = stats.map(s => `<li><b>${s.label}</b>: ${s.v}% ${isAr() ? 'من المرضى' : 'of patients'}</li>`).join('');
      const body = isAr()
        ? `بتحليل <b>${n.toLocaleString()}</b> سجل مريض محمّل فعليًا، أبرز عوامل الخطر انتشارًا هي:<ul>${listHtml}</ul>`
        : `Analyzing the <b>${n.toLocaleString()}</b> patient records actually loaded, the most prevalent risk factors are:<ul>${listHtml}</ul>`;
      appendBotMessage(body, {
        type: 'bar',
        labels: stats.map(s => s.label),
        datasets: [{ data: stats.map(s => +s.v), backgroundColor: pal().warning + 'cc', borderRadius: 5 }]
      });
    } else {
      const body = isAr()
        ? `لم يتم رفع بيانات مرضى بعد، لذا إليك عوامل الخطر المعروفة سريريًا للربو: التاريخ العائلي، التدخين (النشط أو السلبي)، تاريخ الحساسية، حساسية الحيوانات الأليفة، التعرض للتلوث الهوائي أو المهني، والسمنة.<br><br>ارفع ملف بيانات المرضى في تبويب "متنبئ الخطر" للحصول على إحصائيات مخصصة من بياناتك الفعلية.`
        : `No patient dataset has been uploaded yet, so here are the clinically known asthma risk factors: family history, smoking (active or secondhand), history of allergies, pet allergen exposure, air pollution or occupational exposure, and obesity.<br><br>Upload the patient CSV in the "Patient-Level ML Predictor" tab to get personalized statistics from your actual data.`;
      appendBotMessage(body);
    }
  }

  function answerSexSplit() {
    if (!GA().hasMeasure('deaths')) { appendBotMessage(noDataMsg(isAr() ? 'الوفيات (Deaths)' : 'Deaths')); return; }
    const year = GA().getLatestYear();
    const split = GA().getSexSplit('deaths', year);
    const total = split.Male + split.Female || 1;
    const body = isAr()
      ? `توزيع الوفيات (جميع الأعمار) حسب الجنس في <b>${year}</b>: <b>ذكور</b> ${((split.Male / total) * 100).toFixed(1)}% · <b>إناث</b> ${((split.Female / total) * 100).toFixed(1)}%.`
      : `Distribution of deaths (all ages) by sex in <b>${year}</b>: <b>Male</b> ${((split.Male / total) * 100).toFixed(1)}% · <b>Female</b> ${((split.Female / total) * 100).toFixed(1)}%.`;
    appendBotMessage(body, {
      type: 'doughnut',
      labels: ['Male', 'Female'],
      datasets: [{ data: [Math.round(split.Male), Math.round(split.Female)], backgroundColor: [pal().accent, pal().accent2], borderWidth: 0 }]
    });
  }

  function answerMena() {
    if (!GA().hasMeasure('deaths')) { appendBotMessage(noDataMsg(isAr() ? 'الوفيات (Deaths)' : 'Deaths')); return; }
    const year = GA().getLatestYear();
    const all = GA().getCountryRanking('deaths', year, null);
    const inRegion = all.filter(r => MENA_AFRICA.includes(r.country));
    if (!inRegion.length) {
      appendBotMessage(isAr()
        ? 'لا توجد سجلات مطابقة لدول أفريقيا والشرق الأوسط ضمن البيانات المحمّلة حاليًا.'
        : 'No matching Africa / Middle East records found in the currently loaded dataset.');
      return;
    }
    const grandTotal = all.reduce((s, r) => s + r.value, 0) || 1;
    const subTotal = inRegion.reduce((s, r) => s + r.value, 0);
    const share = ((subTotal / grandTotal) * 100).toFixed(1);
    const top = inRegion.slice(0, 6);
    const listHtml = top.map(r => `<li><b>${r.country}</b>: ${Math.round(r.value).toLocaleString()}</li>`).join('');
    const body = isAr()
      ? `منطقة أفريقيا والشرق الأوسط تمثل <b>${share}%</b> من إجمالي الوفيات عالميًا في <b>${year}</b>. أعلى الدول ضمن المنطقة:<ul>${listHtml}</ul>`
      : `The Africa & Middle East region accounts for <b>${share}%</b> of globally recorded deaths in <b>${year}</b>. Top countries within the region:<ul>${listHtml}</ul>`;
    appendBotMessage(body, {
      type: 'bar', horizontal: true,
      labels: top.map(r => r.country),
      datasets: [{ data: top.map(r => Math.round(r.value)), backgroundColor: pal().accent3 + 'cc', borderRadius: 5 }]
    });
  }

  function answerPreventionTips() {
    const body = isAr()
      ? `<b>نصائح عامة للوقاية وضبط الربو:</b><ul>
          <li>حدّد مسبباتك الشخصية (غبار، وبر حيوانات، دخان، حبوب لقاح) وتجنبها قدر الإمكان.</li>
          <li>استخدم أدوية الاستنشاق الوقائية بانتظام كما يصفها طبيبك، وليس فقط عند الأعراض.</li>
          <li>راقب مؤشر جودة الهواء المحلي وقلّل النشاط الخارجي في الأيام السيئة.</li>
          <li>احصل على لقاح الإنفلونزا الموسمي، فالعدوى التنفسية تُفاقم نوبات الربو.</li>
          <li>ضع خطة عمل مكتوبة للربو بالتنسيق مع طبيبك لمعرفة متى تصعّد العلاج.</li>
        </ul>`
      : `<b>General asthma prevention & control tips:</b><ul>
          <li>Identify your personal triggers (dust, pet dander, smoke, pollen) and minimize exposure.</li>
          <li>Use prescribed controller inhalers consistently, not just when symptoms appear.</li>
          <li>Monitor your local air quality index and reduce outdoor exertion on poor-air days.</li>
          <li>Get an annual flu vaccine — respiratory infections commonly trigger flare-ups.</li>
          <li>Keep a written asthma action plan with your physician so you know when to step up treatment.</li>
        </ul>`;
    appendBotMessage(body);
  }

  function answerGina() {
    const body = isAr()
      ? `<b>لمحة عن إرشادات GINA (المبادرة العالمية للربو):</b><br>
        تعتمد إرشادات GINA نهجًا تدريجيًا في العلاج يبدأ بمرطبات الشعب عند الحاجة، وينتقل عند الحاجة إلى علاج مضاد للالتهاب منتظم بجرعات متصاعدة. تُشدّد الإرشادات على استخدام خطة عمل شخصية، ومراجعة دورية للسيطرة على الأعراض، وتفضيل العلاج المركّب (استنشاق كورتيكوستيرويد + موسّع قصبات) كخيار أساسي حتى في الحالات الخفيفة. هذا ملخص عام وليس بديلاً عن استشارة الطبيب.`
      : `<b>A brief overview of GINA (Global Initiative for Asthma) guidance:</b><br>
        GINA guidance follows a stepwise treatment approach, starting with as-needed bronchodilator relief and escalating to regular anti-inflammatory therapy as needed. It emphasizes a personalized written action plan, periodic symptom-control review, and now favors combination inhaled therapy (corticosteroid + bronchodilator) as the preferred option even in milder cases. This is a general summary, not a substitute for medical advice.`;
    appendBotMessage(body);
  }

  function answerCountryPrompt() {
    const countries = GA().getCountries();
    if (!countries.length) { appendBotMessage(noDataMsg('location_name')); return; }
    const defaultCountry = countries.includes('Egypt') ? 'Egypt' : countries[0];
    const uid = 'cb-country-select-' + (msgSeq++);
    const btnId = uid + '-btn';
    const body = `
      <div>${isAr() ? 'اختر دولة لتحليل بياناتها بالتفصيل:' : 'Choose a country for a detailed data breakdown:'}</div>
      <div class="cb-country-row">
        <select id="${uid}">${countries.map(c => `<option value="${escapeHtml(c)}" ${c === defaultCountry ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
        <button class="btn btn-primary btn-sm" id="${btnId}">${window.T('cb-analyze-btn')}</button>
      </div>`;
    appendBotMessage(body);
    document.getElementById(btnId).addEventListener('click', () => {
      const country = document.getElementById(uid).value;
      answerCountryAnalysis(country);
    });
  }

  function answerCountryAnalysis(country) {
    const year = GA().getLatestYear();
    const hasDeaths = GA().hasMeasure('deaths');
    const hasPrev = GA().hasMeasure('prevalence');

    let rankLine = '', prevLine = '', chartSpec = null;

    if (hasDeaths) {
      const ranked = GA().getCountryRanking('deaths', year, null);
      const idx = ranked.findIndex(r => r.country === country);
      if (idx >= 0) {
        rankLine = isAr()
          ? `الترتيب العالمي حسب إجمالي الوفيات: <b>#${idx + 1}</b> من ${ranked.length} دولة (${Math.round(ranked[idx].value).toLocaleString()} حالة وفاة في ${year}).`
          : `Global rank by total deaths: <b>#${idx + 1}</b> of ${ranked.length} countries (${Math.round(ranked[idx].value).toLocaleString()} deaths in ${year}).`;
      }
    }
    if (hasPrev) {
      const trend = GA().getTrend('prevalence', country);
      if (trend.years.length) {
        const lastIdx = trend.years.length - 1;
        const latestAvg = (trend.male[lastIdx] + trend.female[lastIdx]) / 2;
        prevLine = isAr()
          ? `معدل انتشار الربو التقديري في ${year}: <b>${latestAvg.toFixed(2)}%</b> (ذكور ${trend.male[lastIdx].toFixed(2)}% · إناث ${trend.female[lastIdx].toFixed(2)}%).`
          : `Estimated asthma prevalence in ${year}: <b>${latestAvg.toFixed(2)}%</b> (male ${trend.male[lastIdx].toFixed(2)}% · female ${trend.female[lastIdx].toFixed(2)}%).`;
        chartSpec = {
          type: 'line',
          labels: trend.years,
          datasets: [
            { label: 'Male', data: trend.male.map(v => +v.toFixed(2)), borderColor: pal().accent, backgroundColor: pal().accent + '22', fill: true, tension: .35, pointRadius: trend.years.length > 15 ? 0 : 3 },
            { label: 'Female', data: trend.female.map(v => +v.toFixed(2)), borderColor: pal().accent2, backgroundColor: pal().accent2 + '22', fill: true, tension: .35, pointRadius: trend.years.length > 15 ? 0 : 3 }
          ]
        };
      }
    }

    if (!rankLine && !prevLine) { appendBotMessage(noDataMsg(country)); return; }

    const body = isAr()
      ? `<b>تحليل ${country}:</b><br>${rankLine}<br>${prevLine}`
      : `<b>Analysis for ${country}:</b><br>${rankLine}<br>${prevLine}`;
    appendBotMessage(body, chartSpec);
  }

  /* ── FREE-TEXT (LLM-GROUNDED) ─────────────────────────────────── */
  /**
   * Detects any dataset country names mentioned in the user's raw text
   * (case-insensitive substring match) so that a question about a
   * country outside the "top 10" ranking still gets real, specific
   * numbers injected into context instead of the model saying
   * "not in the data" for anything not in a short top-10 list.
   */
  function extractMentionedCountries(text) {
    const lower = text.toLowerCase();
    return GA().getCountries().filter(c => lower.includes(c.toLowerCase()));
  }

  /**
   * Builds a structured, EXPLICITLY LABELED JSON snapshot so the model
   * can never confuse what a number represents (deaths as a count vs.
   * prevalence as a percentage was the #1 source of wrong AI answers
   * previously). Every figure states its measure, metric, unit, and year.
   * Includes EVERY country (not just a top-10 slice) when the dataset is
   * a reasonable size, plus a dedicated "focus" block for any country the
   * user's own question names — this is what fixes "he can't recognize
   * what I typed" for questions about non-top-10 countries.
   */
  function buildGroundingContext(userText) {
    const ga = GA();
    const rows = ga.getData();
    const patients = pm();
    const years = ga.getYears();
    const latestYear = ga.getLatestYear();
    const allCountries = ga.getCountries();

    const context = {
      dataset_scope: { total_records: rows.length, countries: allCountries.length, year_range: years.length ? [years[0], years[years.length - 1]] : [null, null], latest_year: latestYear },
      kpis: ga.computeKPIs().map(k => ({ metric: window.T(k.key), value: k.value }))
    };

    // Include the FULL country ranking when there aren't too many countries,
    // so a question about any specific country (not just the top 10) is answerable.
    const rankCap = allCountries.length <= 60 ? null : 25;

    if (ga.hasMeasure('deaths')) {
      context.all_countries_by_total_deaths_number_unit_count = ga.getCountryRanking('deaths', latestYear, rankCap).map(r => ({ country: r.country, deaths_count: Math.round(r.value), year: latestYear }));
      const sex = ga.getSexSplit('deaths', latestYear);
      context.global_sex_split_deaths_count_latest_year = { male: Math.round(sex.Male), female: Math.round(sex.Female), year: latestYear };
    } else {
      context.deaths_data = 'not available in this dataset';
    }

    if (ga.hasMeasure('prevalence')) {
      context.all_countries_by_prevalence_unit_percent = ga.getCountryRanking('prevalence', latestYear, rankCap).map(r => ({ country: r.country, prevalence_pct: +r.value.toFixed(2), year: latestYear }));
    } else {
      context.prevalence_data = 'not available in this dataset';
    }

    if (ga.hasMeasure('dalys')) {
      context.age_group_dalys_rate_per_100k_latest_year = ga.getAgeGroupBreakdown('dalys', latestYear).map(b => ({ age_group: b.age, dalys_rate_per_100k: +b.value.toFixed(1) }));
    } else {
      context.dalys_data = 'not available in this dataset';
    }

    // Dedicated focus block for any country named in the user's own question —
    // guarantees specific numbers exist even if that country fell outside a
    // capped ranking list.
    if (userText) {
      const mentioned = extractMentionedCountries(userText);
      if (mentioned.length) {
        context.countries_mentioned_in_question_focus = mentioned.map(country => {
          const entry = { country };
          if (ga.hasMeasure('deaths')) {
            const trend = ga.getTrend('deaths', country);
            const lastIdx = trend.years.length - 1;
            if (lastIdx >= 0) entry.deaths_count_latest_year = { male: Math.round(trend.male[lastIdx]), female: Math.round(trend.female[lastIdx]), year: trend.years[lastIdx] };
          }
          if (ga.hasMeasure('prevalence')) {
            const trend = ga.getTrend('prevalence', country);
            const lastIdx = trend.years.length - 1;
            if (lastIdx >= 0) entry.prevalence_pct_latest_year = { male: +trend.male[lastIdx].toFixed(2), female: +trend.female[lastIdx].toFixed(2), year: trend.years[lastIdx] };
            entry.prevalence_trend_by_year_pct = trend.years.map((y, i) => ({ year: y, male: +trend.male[i].toFixed(2), female: +trend.female[i].toFixed(2) }));
          }
          return entry;
        });
      }
    }

    if (patients.length) {
      const n = patients.length;
      const pct = arr => +((arr.filter(Boolean).length / n) * 100).toFixed(1);
      context.patient_level_dataset_unit_percent_of_patients = {
        total_patients: n,
        diagnosed_positive_pct: pct(patients.map(p => p.Diagnosis === 1)),
        family_history_pct: pct(patients.map(p => p.FamilyHistoryAsthma)),
        smoking_pct: pct(patients.map(p => p.Smoking)),
        allergy_history_pct: pct(patients.map(p => p.HistoryOfAllergies)),
        pet_allergy_pct: pct(patients.map(p => p.PetAllergy)),
        high_pollution_exposure_pct: pct(patients.map(p => (p.PollutionExposure || 0) > 6))
      };
    }

    return context;
  }

  async function sendFreeText() {
    const input = document.getElementById('cb-text-input');
    const text = input.value.trim();
    if (!text) return;
    appendUserMessage(text);
    input.value = '';
    const typingEl = appendTypingMessage();
    try {
      const context = JSON.stringify(buildGroundingContext(text));
      const system = isAr()
        ? `أنت محلل بيانات صحية عالمي من الطراز الأول ومتخصص في الطب الرئوي، تجمع بين معرفتك الطبية العامة وتحليل بيانات دقيقة. ستحصل على سياق JSON مستخرج مباشرة من البيانات الفعلية المحمّلة حاليًا.

قاعدتان أساسيتان:
1) أي رقم أو إحصائية تذكرها يجب أن يأتي حصريًا من سياق الـJSON — لا تخترع أبدًا رقمًا غير موجود فيه، وكل رقم مُسمى بوضوح بمقياسه ووحدته (مثلاً "deaths_count" = عدد وفيات، "prevalence_pct" = نسبة مئوية) فلا تخلط بينها.
2) عندما يكون السؤال عامًا أو تعريفيًا أو طبيًا (مثل "ما هو الربو؟"، أو عن الأعراض والأسباب والعلاج) ولا تغطيه بيانات الـJSON، لا ترفض الإجابة ولا تكتفِ بالقول إن البيانات لا تحتوي على تعريف — أجب بمعرفتك الطبية العامة الموثوقة مباشرة وبثقة، ثم إن كان مفيدًا أضف الأرقام ذات الصلة من السياق كسياق داعم. لا تذكر مطلقًا أنك "نموذج لغوي" أو أن إجاباتك "غير سريرية" إلا إذا كان السؤال يطلب استشارة طبية شخصية.

إن ذكر السؤال اسم دولة موجودة في "countries_mentioned_in_question_focus"، استخدم بيانات تلك الدولة تحديدًا. عندما يسمح السياق بذلك، اذهب أبعد من ذكر رقم واحد: قارن بين الفئات، صف الاتجاه عبر السنوات، واربط الأنماط ببعضها لتقديم استنتاج عملي. أجب دائمًا بإجابة كاملة ومنظمة، طبيعية وودودة في أسلوبها، بنقاط أو عناوين فرعية عند الحاجة.`
        : `You are a world-class global-health data analyst and respiratory-medicine expert, blending solid general medical knowledge with precise data analysis. You will receive a JSON context extracted directly from the currently loaded dataset.

Two core rules:
1) Any number or statistic you state must come exclusively from the JSON context — never invent a figure that isn't there. Every number is explicitly labeled with its measure and unit (e.g. "deaths_count" = a death count, "prevalence_pct" = a percentage) — never conflate one measure with another.
2) When the question is general, definitional, or medical (e.g. "what is asthma?", or about symptoms, causes, or treatment) and the JSON context doesn't cover it, do NOT refuse or say the data has no definition — just answer directly and confidently from your own reliable medical knowledge, then add relevant numbers from the context as supporting detail if it's useful. Never say things like "I'm a language model" or "this isn't clinical advice" unless the person is actually asking for personal medical guidance.

If the question names a country present in "countries_mentioned_in_question_focus", use that country's specific data. Whenever the context allows it, go beyond restating a single value: compare across relevant groups (sex, age band, country, year), describe the trend over time if available, and connect related patterns to surface a genuinely useful insight. Always answer in a complete, warm, naturally conversational way — using bullet points or short subheadings where that aids clarity — never a clipped, unhelpful non-answer.`;
      const prompt = isAr()
        ? `السياق (JSON): ${context}\n\nسؤال المستخدم: "${text}"\n\nأجب إجابة كاملة ومفيدة، مستخدمًا معرفتك العامة للأسئلة التعريفية/الطبية ومستخدمًا أرقام السياق حصريًا لأي إحصائية.`
        : `Context (JSON): ${context}\n\nUser question: "${text}"\n\nGive a complete, genuinely helpful answer — use your own general knowledge for definitional/medical questions, and use only the context's numbers for any statistic.`;
      const answer = await window.ApiManager.generate(prompt, { system, maxTokens: 2000, temperature: 0.4 });
      typingEl.remove();
      appendBotMessage(md(answer));
    } catch (e) {
      typingEl.remove();
      const detail = (e && e.message ? e.message : String(e || '')).trim();
      const escapedDetail = document.createElement('div');
      escapedDetail.textContent = detail;
      const detailHtml = escapedDetail.innerHTML;
      appendBotMessage(
        `<span style="color:var(--danger)">${window.T('cb-no-key-warning')}</span>` +
        (detailHtml ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono);word-break:break-word;">${detailHtml}</div>` : '')
      );
    }
  }

  /* ── DATASET STATUS CARD (mirrors Global Analysis Dashboard's data) ── */
  function renderDatasetCard() {
    const el = document.getElementById('cb-dataset-stats');
    if (!el) return;
    const rows = GA().getData();
    const countries = GA().getCountries().length;
    const isMock = GA().isMock ? GA().isMock() : true;
    el.innerHTML = `
      <div class="cb-ds-item"><div class="cb-ds-num">${rows.length.toLocaleString()}</div><div class="cb-ds-lbl">${isAr() ? 'صف' : 'Rows'}</div></div>
      <div class="cb-ds-item"><div class="cb-ds-num">${countries}</div><div class="cb-ds-lbl">${isAr() ? 'دولة' : 'Countries'}</div></div>
      <div class="cb-dataset-badge">${isMock ? (isAr() ? '🟡 بيانات نموذجية' : '🟡 Sample data') : (isAr() ? '🟢 ملف مرفوع' : '🟢 Uploaded file')}</div>`;
  }

  /* ── WELCOME + QUICK LIST RENDERING ───────────────────────────── */
  function renderQuickList() {
    const list = document.getElementById('cb-qlist');
    list.innerHTML = QUESTIONS.map(q => `<button class="cb-qbtn" data-qid="${q.id}"><span class="emoji">${q.emoji}</span><span>${window.T(q.key)}</span></button>`).join('');
    list.querySelectorAll('.cb-qbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = QUESTIONS.find(x => x.id === btn.dataset.qid);
        if (!q) return;
        appendUserMessage(window.T(q.key));
        q.handler();
      });
    });
  }

  function renderWelcome() {
    const box = document.getElementById('cb-messages');
    box.innerHTML = '';
    const countries = GA().getCountries().length;
    const years = GA().getYears();
    const minY = years[0], maxY = years[years.length - 1];
    const body = isAr()
      ? `<b style="font-size:14px;">${window.T('cb-welcome-title')}</b><br><br>
        مبني على البيانات المحمّلة حاليًا في <b>لوحة التحليل العالمي</b> · <b>${countries}</b> دولة · ${minY || '—'}–${maxY || '—'}. لتغيير البيانات ارفع ملفك من هناك، وأدخل مفتاح API في وحدة التحكم لتفعيل التحليل الحر بالذكاء الاصطناعي — أو اسألني أي شيء الآن مباشرة عبر الأزرار السريعة.
        <div class="cb-suggestions">
          <div class="cb-sugg-card" data-qid="top10"><span class="emoji">🌍</span><span>${window.T('cb-q-top10')}</span></div>
          <div class="cb-sugg-card" data-qid="deaths"><span class="emoji">📈</span><span>${window.T('cb-q-deaths')}</span></div>
          <div class="cb-sugg-card" data-qid="riskfactors"><span class="emoji">⚠️</span><span>${window.T('cb-q-riskfactors')}</span></div>
          <div class="cb-sugg-card" data-qid="prevention"><span class="emoji">🛡️</span><span>${window.T('cb-q-prevention')}</span></div>
        </div>`
      : `<b style="font-size:14px;">${window.T('cb-welcome-title')}</b><br><br>
        Built on whatever's currently loaded in the <b>Global Analysis Dashboard</b> · <b>${countries}</b> countries · ${minY || '—'}–${maxY || '—'}. To change the dataset, upload a CSV there; add an API key in the Console to unlock free-form AI analysis — or just click a quick question below right now.
        <div class="cb-suggestions">
          <div class="cb-sugg-card" data-qid="top10"><span class="emoji">🌍</span><span>${window.T('cb-q-top10')}</span></div>
          <div class="cb-sugg-card" data-qid="deaths"><span class="emoji">📈</span><span>${window.T('cb-q-deaths')}</span></div>
          <div class="cb-sugg-card" data-qid="riskfactors"><span class="emoji">⚠️</span><span>${window.T('cb-q-riskfactors')}</span></div>
          <div class="cb-sugg-card" data-qid="prevention"><span class="emoji">🛡️</span><span>${window.T('cb-q-prevention')}</span></div>
        </div>`;
    appendBotMessage(body);
    document.querySelectorAll('.cb-sugg-card').forEach(card => {
      card.addEventListener('click', () => {
        const q = QUESTIONS.find(x => x.id === card.dataset.qid);
        if (!q) return;
        appendUserMessage(window.T(q.key));
        q.handler();
      });
    });
  }

  /* ── THEME / LANG / DATA HOOKS ────────────────────────────────── */
  function onLangChange() {
    renderQuickList();
    renderDatasetCard();
  }
  function onDataChange() { renderDatasetCard(); }

  function init() {
    renderQuickList();
    renderDatasetCard();
    renderWelcome();

    document.getElementById('cb-send-btn').addEventListener('click', sendFreeText);
    document.getElementById('cb-text-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') sendFreeText();
    });
    document.getElementById('cb-open-predictor').addEventListener('click', () => {
      const navBtn = document.querySelector('.nav-item[data-view="patient-ml"]');
      if (navBtn) navBtn.click();
    });
    document.getElementById('cb-goto-global').addEventListener('click', () => {
      const navBtn = document.querySelector('.nav-item[data-view="global-analysis"]');
      if (navBtn) navBtn.click();
    });
  }

  window.ChatBot = { init, onLangChange, onDataChange };
})();

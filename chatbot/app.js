/* ══════════════════════════════════════════════════════════════
   app.js — Application Shell Controller
   Owns: theme engine, EN/AR i18n, sidebar navigation, view routing,
   and generic upload-zone wiring (drag & drop + click).
   Delegates data work to window.GlobalAnalysis / window.PatientML /
   window.ApiManager, each of which exposes onThemeChange()/onLangChange().
   ══════════════════════════════════════════════════════════════ */

window.CURLANG = localStorage.getItem('asthmai_lang') || 'en';
window.CURTHEME = localStorage.getItem('asthmai_theme') || 'dark';

/* ── TRANSLATION DICTIONARY ─────────────────────────────────── */
window.I18N = {
  en: {
    'app-title': 'AsthmAI Platform',
    'app-sub': 'Global Asthma Intelligence & Patient Risk Engine',
    'status-live': 'System Online',
    'logo-sub': 'Clinical Intelligence Suite',
    'nav-global': 'Global Analysis Dashboard',
    'nav-patient': 'Patient-Level ML Predictor',
    'nav-api': 'API Configuration Console',
    'nav-chatbot': 'Ask AsthmAI',
    'upload-global-label': 'Global Study Data',
    'upload-global-title': 'GBD_Asthma_Final.csv',
    'upload-patient-label': 'Patient-Level Data',
    'upload-patient-title': 'asthma_disease_data.csv',
    'upload-drop': 'Drop file or click to browse',
    'footer-note': "AsthmAI is a clinical decision-support demo. Estimates are not a medical diagnosis — always confirm with a licensed physician.",
    'ga-title': 'Global Asthma Intelligence Dashboard',
    'ga-sub': 'Burden-of-disease metrics derived from the Global Burden of Disease (GBD) asthma dataset',
    'ga-chart1-title': 'Deaths by Country (Top 10)',
    'ga-chart2-title': 'Sex Distribution',
    'ga-chart3-title': 'World Prevalence Trend (Male vs Female)',
    'ga-chart4-title': 'Top 10 Countries by Prevalence',
    'ga-chart5-title': 'Age Group Comparison',
    'slicer-year': 'Year',
    'slicer-country': 'Country',
    'slicer-all-world': 'All World',
    'measure-prevalence': 'Prevalence',
    'measure-deaths': 'Deaths',
    'measure-dalys': 'DALYs',
    'no-data-deaths': 'This dataset has no "Deaths" rows to chart.',
    'no-data-prevalence': 'This dataset has no "Prevalence" rows to chart.',
    'no-data-measure': 'This dataset has no "{n}" rows to chart.',
    'refresh-all-btn': 'Refresh All Charts',
    'kpi-interactive-hint': 'KPIs update live with these filters',
    'kpi-dataset-wide': 'Whole dataset',
    'ga-chart6-title': 'Deaths Trend (Male vs Female)',
    'chip-live': 'LIVE DATA',
    'ga-ai-title': 'AI Analytical Summary',
    'ga-ai-btn': 'Generate Insight from Live Charts',
    'ai-placeholder': 'Click generate to get an AI-written analysis of the dashboard currently on screen.',
    'pm-title': 'Patient-Level ML Risk Predictor',
    'pm-sub': 'XGBoost-style gradient-boosted inference engine for individual asthma risk scoring',
    'pm-form-title': 'Patient Risk Factors',
    'f-age': 'Age Group', 'f-age-1': 'Child (0–12)', 'f-age-2': 'Teen (13–19)', 'f-age-3': 'Adult (20–45)', 'f-age-4': 'Middle age (46–65)', 'f-age-5': 'Senior (65+)',
    'f-bmi': 'BMI Category', 'f-bmi-1': 'Normal', 'f-bmi-2': 'Overweight', 'f-bmi-3': 'Obese',
    'f-smoke': 'Smoking Status', 'f-smoke-1': 'Never smoked', 'f-smoke-2': 'Former smoker', 'f-smoke-3': 'Current smoker',
    'f-activity': 'Physical Activity', 'f-act-1': 'High activity', 'f-act-2': 'Moderate activity', 'f-act-3': 'Sedentary',
    'f-pollution': 'Pollution Exposure', 'f-pol-1': 'Low', 'f-pol-2': 'Moderate', 'f-pol-3': 'High',
    'f-aqi': 'Air Quality Index (AQI)', 'f-aqi-1': 'Good', 'f-aqi-2': 'Moderate', 'f-aqi-3': 'Unhealthy', 'f-aqi-4': 'Hazardous',
    'f-occup': 'Occupational Exposure', 'f-occup-1': 'None', 'f-occup-2': 'Some', 'f-occup-3': 'Heavy',
    'f-family': 'Family History', 'f-allergy': 'History of Allergies', 'f-no': 'No', 'f-yes': 'Yes', 'f-pet': 'Pet Allergy',
    'pm-predict-btn': 'Run Risk Inference',
    'pm-ai-explain': 'Explain with AI',
    'pm-grid-title': 'Patient Data Grid',
    'pm-grid-hint': 'Upload the patient CSV in the sidebar, then click any row to auto-fill the form on the left.',
    'pm-grid-empty': 'No patient data loaded yet.',
    'api-title': 'API Configuration Console',
    'api-sub': 'Connect a Large Language Model provider to power AI-generated dashboard summaries and patient risk explanations',
    'api-banner': "Keys are stored only in this browser's local storage and are sent directly from your browser to the provider — never through a third-party server.",
    'api-provider-title': 'Select Provider',
    'prov-gemini-desc': 'gemini-2.5-flash / gemini-1.5-pro via Generative Language API',
    'prov-claude-desc': 'Claude models via Anthropic Messages API',
    'prov-custom-name': 'Custom Endpoint',
    'prov-custom-desc': 'Any OpenAI-compatible chat completions endpoint',
    'prov-agentrouter-desc': 'One key for GPT-5 / GPT-5.5, GLM-5.2, and Claude Opus via agentrouter.org',
    'get-agentrouter-key': 'Get an AgentRouter API Key ↗',
    'api-model-label': 'Model',
    'api-endpoint-label': 'Endpoint URL',
    'api-key-label': 'API Key',
    'api-save-btn': 'Save Configuration',
    'api-test-btn': 'Test Connection',
    'api-status-title': 'Active Configuration',
    // dynamic strings used by JS modules
    'kpi-deaths': 'Total Deaths (latest yr)', 'kpi-countries': 'Countries Covered', 'kpi-prevalence': 'Global Prevalence (latest yr)', 'kpi-dalys': 'Avg DALYs Rate /100k', 'kpi-years': 'Years Covered',
    'risk-low': '🟢 Low Risk', 'risk-mod': '🟡 Moderate Risk', 'risk-high': '🟠 High Risk', 'risk-vhigh': '🔴 Very High Risk',
    'shap-top': 'Top Contributing Factors (SHAP-style)',
    'th-id': 'ID', 'th-age': 'Age', 'th-gender': 'Gender', 'th-bmi': 'BMI', 'th-smoking': 'Smoking', 'th-fev1': 'FEV1', 'th-diagnosis': 'Diagnosis',
    'male': 'Male', 'female': 'Female', 'positive': 'Positive', 'negative': 'Negative',
    'mini-total': 'Total Patients', 'mini-positive': 'Diagnosed +', 'mini-rate': 'Positive Rate',
    'data-loaded': 'Loaded {n} records successfully.', 'data-error': 'Could not parse this file. Check column headers match the expected schema.', 'mock-loaded': 'Showing sample data — upload a CSV to replace it.',
    'api-key-missing': 'Add and save an API key first.', 'api-testing': 'Testing connection…', 'api-conn-ok': 'Connection successful — provider responded correctly.', 'api-conn-fail': 'Connection failed: ',
    'api-config-saved': 'Configuration saved to this browser.',
    'ai-thinking': 'Generating…', 'ai-error': 'Could not reach the AI provider. Check your API key in the Console.',
    'select-patient-first': 'Select a patient row or set form values, then run inference.',
    // Ask AsthmAI (chat bot view)
    'cb-title': 'Ask AsthmAI',
    'cb-sub': 'A data-grounded assistant — every quick-question answer is computed live from the dataset currently loaded, not a generic script',
    'cb-dataset-label': 'Dataset',
    'cb-goto-global': 'Upload / change dataset in Global Analysis',
    'cb-upload-title': 'Drop your GBD CSV here',
    'cb-ask-label': 'Ask AsthmAI',
    'cb-predictor-label': 'XGBoost Risk Predictor',
    'cb-model-badge': 'Model: XGBoost Ensemble · AUC 0.95',
    'cb-model-hint': 'Click to open the full predictor form',
    'cb-input-placeholder': 'Ask about asthma data, countries, risk factors…',
    'cb-q-what': 'What is asthma?',
    'cb-q-region': 'Prevalence by region',
    'cb-q-deaths': 'Deaths trend',
    'cb-q-top10': 'Top 10 countries',
    'cb-q-riskfactors': 'Risk factors',
    'cb-q-sex': 'Male vs female',
    'cb-q-mena': 'Africa & Middle East',
    'cb-q-prevention': 'Prevention tips',
    'cb-q-country': 'Country analysis',
    'cb-q-gina': 'GINA guidelines',
    'cb-welcome-title': 'Welcome to AsthmAI 🫁',
    'cb-thinking': 'Analyzing the dataset…',
    'cb-no-key-warning': 'Free-text questions need an AI provider — add a key in the API Configuration Console. The quick-question buttons on the left work instantly without one, since they read the loaded dataset directly.',
    'cb-analyze-btn': 'Analyze',
    'cb-you': 'You',
    // Predictor recommendations
    'reco-title': 'Personalized Recommendations',
    'reco-family': 'Family history is a strong, non-modifiable risk factor — share it with your physician so screening can start early.',
    'reco-allergy': 'Since allergies are contributing to this score, consider allergy testing to identify and avoid specific triggers.',
    'reco-smoke': 'Quitting smoking (or avoiding secondhand smoke) is one of the single biggest steps to lower this risk.',
    'reco-aqi': 'On poor air-quality days, limit outdoor exertion and consider an N95-type mask or an indoor air purifier.',
    'reco-pet': 'Keep pets out of the bedroom and consider HEPA filtration if pet dander is a known trigger.',
    'reco-pollution': 'Reduce exposure to environmental pollution where possible — ventilate indoor spaces and monitor local air quality indices.',
    'reco-bmi': 'Gradual weight management through diet and activity can meaningfully reduce airway inflammation risk.',
    'reco-occup': 'Discuss occupational exposure controls (masks, ventilation, job modification) with an occupational health provider.',
    'reco-activity': 'Regular moderate physical activity is protective — aim for at least 150 minutes per week as tolerated.',
    'reco-see-doctor': 'This score is in a higher range — please schedule an evaluation with a licensed physician or pulmonologist.',
    'reco-maintain': 'This score is in a lower range — keep up current habits and monitor for any new symptoms.',
    'parsing-large': 'Processing dataset — large files run in a background thread and may take a few seconds…',
  },
  ar: {
    'app-title': 'منصة AsthmAI',
    'app-sub': 'استخبارات الربو العالمية ومحرك مخاطر المرضى',
    'status-live': 'النظام متصل',
    'logo-sub': 'مجموعة الذكاء السريري',
    'nav-global': 'لوحة التحليل العالمي',
    'nav-patient': 'متنبئ التعلم الآلي للمرضى',
    'nav-api': 'وحدة تهيئة API',
    'nav-chatbot': 'اسأل AsthmAI',
    'upload-global-label': 'بيانات الدراسة العالمية',
    'upload-global-title': 'GBD_Asthma_Final.csv',
    'upload-patient-label': 'بيانات المرضى',
    'upload-patient-title': 'asthma_disease_data.csv',
    'upload-drop': 'اسحب الملف هنا أو اضغط للاختيار',
    'footer-note': 'AsthmAI عرض توضيحي لدعم القرار السريري. التقديرات ليست تشخيصًا طبيًا — يرجى دائمًا استشارة طبيب مرخّص.',
    'ga-title': 'لوحة استخبارات الربو العالمية',
    'ga-sub': 'مؤشرات عبء المرض المستخرجة من بيانات الربو العالمية (GBD)',
    'ga-chart1-title': 'الوفيات حسب الدولة (أعلى 10)',
    'ga-chart2-title': 'التوزيع حسب الجنس',
    'ga-chart3-title': 'اتجاه الانتشار العالمي (ذكور مقابل إناث)',
    'ga-chart4-title': 'أعلى 10 دول من حيث الانتشار',
    'ga-chart5-title': 'مقارنة الفئات العمرية',
    'slicer-year': 'السنة',
    'slicer-country': 'الدولة',
    'slicer-all-world': 'كل العالم',
    'measure-prevalence': 'الانتشار',
    'measure-deaths': 'الوفيات',
    'measure-dalys': 'DALYs',
    'no-data-deaths': 'لا توجد صفوف "وفيات" في هذه البيانات لعرضها.',
    'no-data-prevalence': 'لا توجد صفوف "انتشار" في هذه البيانات لعرضها.',
    'no-data-measure': 'لا توجد صفوف "{n}" في هذه البيانات لعرضها.',
    'refresh-all-btn': 'تحديث كل الرسوم',
    'kpi-interactive-hint': 'المؤشرات تتحدث مباشرة مع هذه الفلاتر',
    'kpi-dataset-wide': 'كل البيانات',
    'ga-chart6-title': 'اتجاه الوفيات (ذكور مقابل إناث)',
    'chip-live': 'بيانات حية',
    'ga-ai-title': 'الملخص التحليلي بالذكاء الاصطناعي',
    'ga-ai-btn': 'إنشاء تحليل من الرسوم الحالية',
    'ai-placeholder': 'اضغط لإنشاء تحليل مكتوب بالذكاء الاصطناعي للوحة المعروضة حاليًا.',
    'pm-title': 'متنبئ مخاطر المرضى بالتعلم الآلي',
    'pm-sub': 'محرك استدلال بأسلوب XGBoost لتقييم خطر الربو الفردي',
    'pm-form-title': 'عوامل خطر المريض',
    'f-age': 'الفئة العمرية', 'f-age-1': 'طفل (0–12)', 'f-age-2': 'مراهق (13–19)', 'f-age-3': 'بالغ (20–45)', 'f-age-4': 'متوسط العمر (46–65)', 'f-age-5': 'كبار السن (65+)',
    'f-bmi': 'فئة مؤشر كتلة الجسم', 'f-bmi-1': 'طبيعي', 'f-bmi-2': 'زيادة وزن', 'f-bmi-3': 'سمنة',
    'f-smoke': 'حالة التدخين', 'f-smoke-1': 'لم يدخن قط', 'f-smoke-2': 'مدخن سابق', 'f-smoke-3': 'مدخن حالي',
    'f-activity': 'النشاط البدني', 'f-act-1': 'نشاط عالٍ', 'f-act-2': 'نشاط متوسط', 'f-act-3': 'خامل',
    'f-pollution': 'التعرض للتلوث', 'f-pol-1': 'منخفض', 'f-pol-2': 'متوسط', 'f-pol-3': 'مرتفع',
    'f-aqi': 'مؤشر جودة الهواء', 'f-aqi-1': 'جيد', 'f-aqi-2': 'متوسط', 'f-aqi-3': 'غير صحي', 'f-aqi-4': 'خطير',
    'f-occup': 'التعرض المهني', 'f-occup-1': 'لا يوجد', 'f-occup-2': 'بعض التعرض', 'f-occup-3': 'تعرض شديد',
    'f-family': 'التاريخ العائلي', 'f-allergy': 'تاريخ الحساسية', 'f-no': 'لا', 'f-yes': 'نعم', 'f-pet': 'حساسية الحيوانات الأليفة',
    'pm-predict-btn': 'تشغيل الاستدلال بالمخاطر',
    'pm-ai-explain': 'اشرح بالذكاء الاصطناعي',
    'pm-grid-title': 'جدول بيانات المرضى',
    'pm-grid-hint': 'ارفع ملف بيانات المرضى من الشريط الجانبي، ثم اضغط على أي صف لتعبئة النموذج تلقائيًا.',
    'pm-grid-empty': 'لم يتم تحميل بيانات مرضى بعد.',
    'api-title': 'وحدة تهيئة API',
    'api-sub': 'اربط مزوّد نموذج لغوي كبير لتشغيل الملخصات وتفسيرات المخاطر بالذكاء الاصطناعي',
    'api-banner': 'يتم حفظ المفاتيح فقط في التخزين المحلي لهذا المتصفح وتُرسل مباشرة من متصفحك إلى المزوّد — دون المرور بأي خادم خارجي.',
    'api-provider-title': 'اختر المزوّد',
    'prov-gemini-desc': 'gemini-2.5-flash / gemini-1.5-pro عبر واجهة Generative Language API',
    'prov-claude-desc': 'نماذج Claude عبر واجهة Anthropic Messages API',
    'prov-custom-name': 'نقطة نهاية مخصصة',
    'prov-custom-desc': 'أي نقطة نهاية متوافقة مع OpenAI chat completions',
    'prov-agentrouter-desc': 'مفتاح واحد لنماذج GPT-5 / GPT-5.5 وGLM-5.2 وClaude Opus عبر agentrouter.org',
    'get-agentrouter-key': 'احصل على مفتاح API من AgentRouter ↗',
    'api-model-label': 'النموذج',
    'api-endpoint-label': 'رابط نقطة النهاية',
    'api-key-label': 'مفتاح API',
    'api-save-btn': 'حفظ الإعدادات',
    'api-test-btn': 'اختبار الاتصال',
    'api-status-title': 'الإعداد الحالي',
    'kpi-deaths': 'إجمالي الوفيات (آخر سنة)', 'kpi-countries': 'عدد الدول المشمولة', 'kpi-prevalence': 'الانتشار العالمي (آخر سنة)', 'kpi-dalys': 'متوسط معدل DALYs /100 ألف', 'kpi-years': 'السنوات المشمولة',
    'risk-low': '🟢 خطر منخفض', 'risk-mod': '🟡 خطر متوسط', 'risk-high': '🟠 خطر مرتفع', 'risk-vhigh': '🔴 خطر مرتفع جدًا',
    'shap-top': 'أهم العوامل المؤثرة (بأسلوب SHAP)',
    'th-id': 'المعرف', 'th-age': 'العمر', 'th-gender': 'الجنس', 'th-bmi': 'مؤشر الكتلة', 'th-smoking': 'التدخين', 'th-fev1': 'FEV1', 'th-diagnosis': 'التشخيص',
    'male': 'ذكر', 'female': 'أنثى', 'positive': 'إيجابي', 'negative': 'سلبي',
    'mini-total': 'إجمالي المرضى', 'mini-positive': 'تشخيص إيجابي', 'mini-rate': 'نسبة الإيجابية',
    'data-loaded': 'تم تحميل {n} سجل بنجاح.', 'data-error': 'تعذّر تحليل هذا الملف. تحقق من تطابق رؤوس الأعمدة مع المخطط المتوقع.', 'mock-loaded': 'يتم عرض بيانات نموذجية — ارفع ملف CSV لاستبدالها.',
    'api-key-missing': 'أضف واحفظ مفتاح API أولاً.', 'api-testing': 'جارٍ اختبار الاتصال…', 'api-conn-ok': 'تم الاتصال بنجاح — استجاب المزوّد بشكل صحيح.', 'api-conn-fail': 'فشل الاتصال: ',
    'api-config-saved': 'تم حفظ الإعدادات في هذا المتصفح.',
    'ai-thinking': 'جارٍ الإنشاء…', 'ai-error': 'تعذّر الوصول لمزوّد الذكاء الاصطناعي. تحقق من مفتاح API في وحدة التحكم.',
    'select-patient-first': 'اختر صف مريض أو حدد قيم النموذج، ثم شغّل الاستدلال.',
    // اسأل AsthmAI
    'cb-title': 'اسأل AsthmAI',
    'cb-sub': 'مساعد مبني على البيانات — كل إجابة على الأسئلة السريعة تُحسب مباشرة من مجموعة البيانات المحمّلة حاليًا، وليست نصًا عامًا جاهزًا',
    'cb-dataset-label': 'قاعدة البيانات',
    'cb-goto-global': 'ارفع / غيّر البيانات من لوحة التحليل العالمي',
    'cb-upload-title': 'أسقط ملف GBD هنا',
    'cb-ask-label': 'اسأل AsthmAI',
    'cb-predictor-label': 'متنبئ الخطر XGBoost',
    'cb-model-badge': 'النموذج: XGBoost Ensemble · AUC 0.95',
    'cb-model-hint': 'اضغط لفتح نموذج التنبؤ الكامل',
    'cb-input-placeholder': 'اسأل عن بيانات الربو، الدول، عوامل الخطر...',
    'cb-q-what': 'ما هو الربو؟',
    'cb-q-region': 'الانتشار حسب المنطقة',
    'cb-q-deaths': 'اتجاه الوفيات',
    'cb-q-top10': 'أفضل 10 دول',
    'cb-q-riskfactors': 'عوامل الخطر',
    'cb-q-sex': 'ذكور مقابل إناث',
    'cb-q-mena': 'أفريقيا والشرق الأوسط',
    'cb-q-prevention': 'نصائح الوقاية',
    'cb-q-country': 'تحليل الدولة',
    'cb-q-gina': 'إرشادات GINA',
    'cb-welcome-title': 'أهلاً بك في AsthmAI 🫁',
    'cb-thinking': 'جارٍ تحليل البيانات…',
    'cb-no-key-warning': 'الأسئلة الحرة تحتاج مزوّد ذكاء اصطناعي — أضف مفتاحًا في وحدة تهيئة API. أزرار الأسئلة السريعة على اليسار تعمل فورًا دون الحاجة لمفتاح، لأنها تقرأ البيانات المحمّلة مباشرة.',
    'cb-analyze-btn': 'تحليل',
    'cb-you': 'أنت',
    'reco-title': 'توصيات مخصصة',
    'reco-family': 'التاريخ العائلي عامل خطر قوي غير قابل للتعديل — شاركه مع طبيبك ليتمكن من بدء الفحص المبكر.',
    'reco-allergy': 'بما أن الحساسية تساهم في هذه الدرجة، يُنصح بإجراء اختبارات حساسية لتحديد المسببات وتجنبها.',
    'reco-smoke': 'الإقلاع عن التدخين (أو تجنب التدخين السلبي) من أهم الخطوات لخفض هذا الخطر.',
    'reco-aqi': 'في أيام جودة الهواء السيئة، قلّل المجهود الخارجي وفكّر باستخدام كمامة N95 أو منقّي هواء داخلي.',
    'reco-pet': 'أبعد الحيوانات الأليفة عن غرفة النوم وفكّر في فلاتر HEPA إذا كانت وبرة الحيوانات مسببًا معروفًا.',
    'reco-pollution': 'قلّل التعرض للتلوث البيئي قدر الإمكان — هوّي الأماكن المغلقة وتابع مؤشرات جودة الهواء المحلية.',
    'reco-bmi': 'إدارة الوزن التدريجية عبر التغذية والنشاط يمكن أن تقلل بشكل ملموس من خطر التهاب مجرى الهواء.',
    'reco-occup': 'ناقش وسائل التحكم بالتعرض المهني (كمامات، تهوية، تعديل العمل) مع مختص الصحة المهنية.',
    'reco-activity': 'النشاط البدني المعتدل المنتظم عامل وقائي — استهدف 150 دقيقة أسبوعيًا على الأقل حسب القدرة.',
    'reco-see-doctor': 'هذه الدرجة في نطاق مرتفع — يرجى تحديد موعد تقييم مع طبيب مرخّص أو أخصائي أمراض صدرية.',
    'reco-maintain': 'هذه الدرجة في نطاق منخفض — حافظ على عاداتك الحالية وراقب ظهور أي أعراض جديدة.',
    'parsing-large': 'جارٍ معالجة البيانات — الملفات الكبيرة تُعالَج في خيط خلفي وقد تستغرق بضع ثوانٍ…',
  }
};

window.T = function (key) {
  return (window.I18N[window.CURLANG] && window.I18N[window.CURLANG][key]) || key;
};
window.Tf = function (key, ...args) {
  let s = window.T(key);
  args.forEach((a, i) => { s = s.replace('{n}', a); });
  return s;
};

/* ── LIGHTWEIGHT MARKDOWN → HTML (for AI responses) ─────────────
   AI providers reply in Markdown (**bold**, ### headers, - lists).
   Without conversion that markup leaked into the UI as literal
   asterisks/hashes. This covers just enough syntax to render cleanly
   without pulling in a full Markdown library. */
window.mdToHtml = function (text) {
  if (!text) return '';
  const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let src = escapeHtml(text).replace(/\r\n/g, '\n');

  const lines = src.split('\n');
  let html = '';
  let inList = false;
  let listType = null;

  function closeList() {
    if (inList) { html += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; listType = null; }
  }
  function inline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); html += '<br>'; return; }

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); const lvl = Math.min(h[1].length + 2, 5); html += `<h${lvl} style="margin:10px 0 6px;font-size:${16 - lvl}px;">${inline(h[2])}</h${lvl}>`; return; }

    const ol = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (ol) { if (!inList || listType !== 'ol') { closeList(); html += '<ol style="margin:4px 0 8px;padding-inline-start:20px;">'; inList = true; listType = 'ol'; } html += `<li>${inline(ol[2])}</li>`; return; }

    const ul = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ul) { if (!inList || listType !== 'ul') { closeList(); html += '<ul style="margin:4px 0 8px;padding-inline-start:20px;">'; inList = true; listType = 'ul'; } html += `<li>${inline(ul[1])}</li>`; return; }

    closeList();
    html += `<div>${inline(trimmed)}</div>`;
  });
  closeList();
  return html;
};

/* ── APPLY LANGUAGE ──────────────────────────────────────────── */
function applyLanguage(lang) {
  window.CURLANG = lang;
  localStorage.setItem('asthmai_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = window.T(key);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    el.setAttribute('placeholder', window.T(key));
  });

  document.querySelectorAll('#lang-toggle .toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });

  if (window.GlobalAnalysis && window.GlobalAnalysis.onLangChange) window.GlobalAnalysis.onLangChange();
  if (window.PatientML && window.PatientML.onLangChange) window.PatientML.onLangChange();
  if (window.ApiManager && window.ApiManager.onLangChange) window.ApiManager.onLangChange();
  if (window.ChatBot && window.ChatBot.onLangChange) window.ChatBot.onLangChange();
}

/* ── APPLY THEME ─────────────────────────────────────────────── */
function applyTheme(theme) {
  window.CURTHEME = theme;
  localStorage.setItem('asthmai_theme', theme);
  document.body.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  icon.innerHTML = theme === 'dark'
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';

  if (window.GlobalAnalysis && window.GlobalAnalysis.onThemeChange) window.GlobalAnalysis.onThemeChange();
  if (window.PatientML && window.PatientML.onThemeChange) window.PatientML.onThemeChange();
}

/* ── NAVIGATION ──────────────────────────────────────────────── */
function switchView(viewKey) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === viewKey));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewKey).classList.add('active');

  document.getElementById('sidebar-global-upload').style.display = viewKey === 'global-analysis' ? 'block' : 'none';
  document.getElementById('sidebar-patient-upload').style.display = viewKey === 'patient-ml' ? 'block' : 'none';

  if (window.innerWidth <= 860) document.getElementById('sidebar').classList.remove('open');
}

/* ── GENERIC UPLOAD ZONE WIRING ──────────────────────────────── */
function wireUploadZone(zoneId, inputId, onFile) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  input.addEventListener('change', e => { const f = e.target.files[0]; if (f) onFile(f); });
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) { input.files = e.dataTransfer.files; onFile(f); }
  });
}

/* ── INIT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(window.CURTHEME);
  applyLanguage(window.CURLANG);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 860) {
      sidebar.classList.remove('collapsed');
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.remove('open');
      sidebar.classList.toggle('collapsed');
    }
  });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(window.CURTHEME === 'dark' ? 'light' : 'dark');
  });

  document.querySelectorAll('#lang-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

  wireUploadZone('global-upload-zone', 'global-csv-file', f => window.GlobalAnalysis.loadCSV(f));
  wireUploadZone('patient-upload-zone', 'patient-csv-file', f => window.PatientML.loadCSV(f));

  // Boot modules
  if (window.ApiManager) window.ApiManager.init();
  if (window.GlobalAnalysis) window.GlobalAnalysis.init();
  if (window.PatientML) window.PatientML.init();
  if (window.ChatBot) window.ChatBot.init();
});

/**
 * معجم مصطلحات سباقات الهجن الخليجية وتهيئة موجهات الذكاء الاصطناعي (Prompt Biasing)
 * محدث بالبيانات الحقيقية لمهرجان سمو ولي العهد السعودي وميادين الطائف والوثبة والشحانية
 */

export interface CamelTerm {
  term: string;
  category: 'سن المطية' | 'الجنس والنوع' | 'الأشواط والرموز' | 'الميدان والمهرجانات' | 'الأنساب والسلالات' | 'الأدوار والمصطلحات';
  description: string;
}

export interface DialectIntentMapping {
  dialectTerm: string;
  fieldMeaning: string;
  targetSqlColumnOrTable: string;
  sqlPatternExample: string;
  notes: string;
}

/**
 * قاموس المرادفات ولهجة الميدان العفوية (Intent Mapping to SQL / Schema)
 * يترجم الكلمات والعبارات المحلية في ميادين الهجن إلى استعلامات SQL وأعمدة دقيقة
 */
export const DIALECT_INTENT_MAPPINGS: DialectIntentMapping[] = [
  {
    dialectTerm: 'هلا / مرحبا / السلام عليكم / كيف الحال / شخبارك / شلونك',
    fieldMeaning: 'قاعدة (1) الترحيب المخصص (Personalized Greetings)',
    targetSqlColumnOrTable: 'سحب اسم المستخدم (userName / pushName) من حساب التطبيق أو الواتساب',
    sqlPatternExample: '-- رد ثابت مخصص: "مرحبا بك [اسم المستخدم]، كيف يمكنني مساعدتك؟"',
    notes: 'في حال عدم توفر اسم العميل من الحساب يُستخدم اللقب الافتراضي (يا غالي) مع توليد صوت للسماعة 🔊',
  },
  {
    dialectTerm: 'من أنت؟ / مين انت / شنو انت / عرفني عن نفسك / وش اسمك',
    fieldMeaning: 'قاعدة (2) تحديد الهوية (Bot Identity)',
    targetSqlColumnOrTable: 'رد الهوية الحصري بدون استعلام قاعدة بيانات',
    sqlPatternExample: '-- رد ثابت حصري: "أنا مساعدك الذكي"',
    notes: 'يجيب البوت حصراً بعبارة "أنا مساعدك الذكي" مع دعم النطق الصوتي عبر زر السماعة 🔊',
  },
  {
    dialectTerm: 'أي استعلام عن نتائج الأشواط أو المطايا أو المضمرين أو التوقيت',
    fieldMeaning: 'قاعدة (3) حالة الانتظار والبحث (Loading / Searching State)',
    targetSqlColumnOrTable: 'إظهار مؤشر فوري ("جاري البحث...") قبل استعلام race_results و chat_embeddings',
    sqlPatternExample: '-- إرسال إشعار أولي فوري: "جاري البحث..." ريثما يتم جلب النتيجة وعرضها',
    notes: 'يظهر فوراً في واجهة العميل والواتساب حتى يعرف العميل أن النظام يعمل ولم يتجاهل رسالته',
  },
  {
    dialectTerm: 'آخر 100 متر / اخر 100 متر / لقطة النهاية / لحظة الدخول / درك النهاية',
    fieldMeaning: 'قاعدة (4) جلب لقطات النهاية وحساب الطابع الزمني للفيديو (Timestamp Calculation)',
    targetSqlColumnOrTable: 'عمود media_urls وعمود time_in_seconds في جدول race_results',
    sqlPatternExample: "SELECT winner_name, media_urls[1], GREATEST(FLOOR(time_in_seconds - 25), 0) AS finish_clip_start_sec FROM race_results WHERE track_name ILIKE '%المرموم%';",
    notes: 'يقوم البوت بخصم آخر 25 ثانية (بين 20 و 30 ثانية) من إجمالي توقيت الركض ويرسل رابط الفيديو مع طابع زمني مباشر (?t=XXXs)',
  },
  {
    dialectTerm: 'من تم قبضه / المطايا المحظورة / الفحص / مواد محظورة / منشطات / مخالفات',
    fieldMeaning: 'قاعدة (5) الاستعلام عن المطايا المحظورة والربط العلائقي (Doping / Violations SQL JOIN)',
    targetSqlColumnOrTable: 'جدول المخالفات doping_violations INNER JOIN جدول النتائج الأساسي race_results',
    sqlPatternExample: "SELECT v.festival_name, v.heat_number, v.rank, CASE WHEN v.rank = 1 THEN r.winner_name WHEN v.rank = 2 THEN r.second_place ELSE r.third_place END AS camel_name, r.owner_name, r.trainer_name FROM doping_violations v INNER JOIN race_results r ON r.festival_name ILIKE '%' || v.festival_name || '%' AND r.heat_number = v.heat_number;",
    notes: 'إذا سأل المستخدم بشكل عام يرد البوت فوراً: "في أي سباق أو في أي ريس أو مهرجان طال عمرك؟"، وعند التحديد يستخرج اسم المطية والمالك والمضمر تلقائياً عبر JOIN',
  },
  {
    dialectTerm: 'مركاض / مركاب / المرماز / الشارة',
    fieldMeaning: 'السباق أو المهرجان أو أشواط اليوم الميدانية',
    targetSqlColumnOrTable: 'جدول race_results والبحث في الأشواط (heat_number, festival_name, track_name)',
    sqlPatternExample: "SELECT * FROM race_results WHERE DATE(created_at) = CURRENT_DATE ORDER BY heat_number ASC;",
    notes: 'توجه البحث مباشرة إلى الجدول العام للأشواط ونتائج السباق الحالية أو المحددة',
  },
  {
    dialectTerm: 'من سبج / من سبق / من خذا الشوط / من قلع الكأس / راعي الأول / من خطف الشوط',
    fieldMeaning: 'الفائز بالمركز الأول أو حامل الرمز',
    targetSqlColumnOrTable: 'عمود winner_name وعمود owner_name',
    sqlPatternExample: "SELECT winner_name, owner_name, trainer_name, time_recorded FROM race_results WHERE heat_number = :heat;",
    notes: 'يفهم حرف الجيم (سبج) كبديل للقاف الخليجية الميدانية (سبق) وتوجه مباشرة لعمود الفائز',
  },
  {
    dialectTerm: 'العام / العام الأول / العام الماضي',
    fieldMeaning: 'السنة الماضية أو الموسم السابق',
    targetSqlColumnOrTable: 'شرط التاريخ EXTRACT(YEAR FROM created_at) = CURRENT_YEAR - 1',
    sqlPatternExample: "SELECT * FROM race_results WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) - 1;",
    notes: 'يفهم أن "العام" تعني سنة مضت وليس اليوم أو الأمس',
  },
  {
    dialectTerm: 'أول أمس / أولت أمس / قبل البارحة',
    fieldMeaning: 'قبل يومين من التاريخ الحالي',
    targetSqlColumnOrTable: "DATE(created_at) = CURRENT_DATE - INTERVAL '2 days'",
    sqlPatternExample: "SELECT * FROM race_results WHERE DATE(created_at) = CURRENT_DATE - 2;",
    notes: 'تحديد دقيق للنطاق الزمني',
  },
  {
    dialectTerm: 'الفطامين / فطيم / مفاريد',
    fieldMeaning: 'فئة وصغار الهجن (عمر سنة إلى سنة ونصف)',
    targetSqlColumnOrTable: "category ILIKE '%مفاريد%' OR category ILIKE '%فطامين%'",
    sqlPatternExample: "SELECT * FROM race_results WHERE category ILIKE '%مفاريد%' OR category ILIKE '%فطامين%';",
    notes: 'توجه الاستعلام إلى عمود الفئة category',
  },
  {
    dialectTerm: 'الحقايق / اللقايا / الجذاع (الإيذاع) / الثنايا / الحول / الزمول',
    fieldMeaning: 'الفئات العمرية للهجن الأصايل',
    targetSqlColumnOrTable: 'عمود category',
    sqlPatternExample: "SELECT * FROM race_results WHERE category ILIKE '%ثنايا%';",
    notes: 'تطابق فوري مع عمود الفئة والسن في جدول السباقات',
  },
  {
    dialectTerm: 'الختامي / ختامي المرموم / ختامي الوثبة / سيف الملك / ولي العهد / الشحانية',
    fieldMeaning: 'الميادين والمهرجانات الختامية الكبرى',
    targetSqlColumnOrTable: 'عمود track_name أو festival_name',
    sqlPatternExample: "SELECT * FROM race_results WHERE track_name ILIKE '%المرموم%' OR festival_name ILIKE '%المرموم%';",
    notes: 'توجه البحث إلى عمود اسم الميدان أو اسم المهرجان',
  },
  {
    dialectTerm: 'من مضمرها / من مدمرها / التضمير / راعي التضمير / من قادها',
    fieldMeaning: 'المضمر الفني والمشرف على تدريب وتجهيز المطية',
    targetSqlColumnOrTable: 'عمود trainer_name',
    sqlPatternExample: "SELECT winner_name, trainer_name, owner_name FROM race_results WHERE trainer_name IS NOT NULL;",
    notes: 'البحث المستقل في عمود المضمر المنفصل تماماً عن المالك',
  },
  {
    dialectTerm: 'وش سلالتها / من أبوها / سلالة الفحل / بعير من / وش أصلها',
    fieldMeaning: 'اسم الأب وسلالة الفحل والمختبر',
    targetSqlColumnOrTable: 'عمود sire_lineage',
    sqlPatternExample: "SELECT winner_name, sire_lineage, owner_name FROM race_results WHERE sire_lineage ILIKE '%جبار%';",
    notes: 'توجه البحث مباشرة لعمود سلالة الأب sire_lineage',
  },
  {
    dialectTerm: 'أحسن توقيت / أفضل وقت / أسرع شوط / من كسر التيم / حطم الرقم',
    fieldMeaning: 'أسرع توقيت مسجل في الأشواط',
    targetSqlColumnOrTable: 'ORDER BY time_in_seconds ASC LIMIT 1',
    sqlPatternExample: "SELECT winner_name, owner_name, time_recorded FROM race_results ORDER BY time_in_seconds ASC LIMIT 1;",
    notes: 'فرز تصاعدي حسب حقل الثواني time_in_seconds',
  },
  {
    dialectTerm: 'تسعيرة / مشتريات / كم بيعت / الشراء الإلزامي',
    fieldMeaning: 'التسعيرة الرسمية المقررة للمطايا الفائزة بالمراكز الأولى',
    targetSqlColumnOrTable: "notes ILIKE '%تسعيرة%' OR raw_message_text ILIKE '%تسعيرة%'",
    sqlPatternExample: "SELECT winner_name, owner_name, notes FROM race_results WHERE notes ILIKE '%تسعيرة%';",
    notes: 'البحث في ملاحظات الأشواط والتسعيرات الرسمية',
  },
];

export const CAMEL_RACING_GLOSSARY: CamelTerm[] = [
  // أعمار وسن الهجن
  { term: 'مفاريد', category: 'سن المطية', description: 'الهجن بعمر سنة واحدة (أول فئة تبدأ التدريب والسباق، 1.5 - 2 كم)' },
  { term: 'حقايق', category: 'سن المطية', description: 'الهجن بعمر سنتين (مسافة السباق غالباً 3 - 4 كم)' },
  { term: 'لقايا', category: 'سن المطية', description: 'الهجن بعمر ثلاث سنوات (مسافة السباق 4 - 5 كم)' },
  { term: 'إيذاع', category: 'سن المطية', description: 'الهجن بعمر أربع سنوات (مسافة السباق 5 - 6 كم)' },
  { term: 'ثنايا', category: 'سن المطية', description: 'الهجن بعمر خمس سنوات (مسافة السباق 6 - 8 كم)' },
  { term: 'حول', category: 'سن المطية', description: 'إناث الهجن بعمر ست سنوات فما فوق (الفئة الكبرى، 8 كم)' },
  { term: 'زمول', category: 'سن المطية', description: 'ذكور الهجن بعمر ست سنوات فما فوق (الفئة الكبرى، 8 كم)' },

  // الجنس والنوع
  { term: 'بكار', category: 'الجنس والنوع', description: 'إناث الإبل (جمع بكرة، مثل: بكار مفتوح، بكار عام، بكار إنتاج)' },
  { term: 'قعدان', category: 'الجنس والنوع', description: 'ذكور الإبل (جمع قعود، مثل: قعدان مفتوح، قعدان عام)' },
  { term: 'مطية', category: 'الجنس والنوع', description: 'تطلق على الناقة أو الجمل المعد والمجهز لخوض السباقات' },
  { term: 'هجن الرئاسة', category: 'الجنس والنوع', description: 'المؤسسة العريقة لهجن الرئاسة في دولة الإمارات العربية المتحدة' },
  { term: 'هجن الشحانية', category: 'الجنس والنوع', description: 'المؤسسة الرائدة لسباقات الهجن في دولة قطر' },
  { term: 'هجن العاصفة', category: 'الجنس والنوع', description: 'مؤسسة هجن دبي الرائدة بإشراف سمو الشيخ حمدان بن محمد' },

  // الأشواط والرموز
  { term: 'شوط الرمز', category: 'الأشواط والرموز', description: 'الجائزة الكبرى للشوط الرئيسي (كأس، بندقية، خنجر، شلفة، درع، سيف)' },
  { term: 'الكأس', category: 'الأشواط والرموز', description: 'كأس الشوط الرئيسي للأشواط المفتوحة والعامة (مثل: كأس الثنايا بكار، كأس القعدان)' },
  { term: 'البندقية', category: 'الأشواط والرموز', description: 'رمز أشواط القعدان في المهرجانات الكبرى' },
  { term: 'الشوط المفتوح', category: 'الأشواط والرموز', description: 'شوط متاح لمؤسسات أصحاب السمو والشيوخ وعامة الملاك' },
  { term: 'الشوط العام', category: 'الأشواط والرموز', description: 'شوط مخصص لأبناء القبائل وعامة الملاك' },
  { term: 'أشواط الإنتاج', category: 'الأشواط والرموز', description: 'أشواط مخصصة للمطايا المولودة والمنتجة محلياً في عزبة المالك' },

  // الأنساب والسلالات والفحول
  { term: 'جبار ولد لحقه', category: 'الأنساب والسلالات', description: 'بعير المختبر الشهير من أشهر سلالات الإنتاج في الخليج' },
  { term: 'سلفر', category: 'الأنساب والسلالات', description: 'الفحل الشهير بعير ابن قريع سابقاً وحالياً عند هجن الرئاسة' },
  { term: 'الحريثي العيده', category: 'الأنساب والسلالات', description: 'سلالة الفحل الحريثي العيده ولد ناصي المختبر' },
  { term: 'ناصي المختبر', category: 'الأنساب والسلالات', description: 'أحد أشهر وأعرق فحول وسلالات الهجن في الجزيرة العربية' },
  { term: 'شاهين / صوغان / هملول', category: 'الأنساب والسلالات', description: 'السلالات التاريخية العريقة لإبل السباق الأصايل' },

  // الميدان والمهرجانات
  { term: 'مهرجان ولي العهد للهجن', category: 'الميدان والمهرجانات', description: 'أكبر مهرجان لسباقات الهجن في العالم يقام بميدان الطائف بالمملكة العربية السعودية' },
  { term: 'ميدان الطائف', category: 'الميدان والمهرجانات', description: 'ميدان الملك عبدالعزيز لسباقات الهجن بمحافظة الطائف (عرفه)' },
  { term: 'ميدان الوثبة', category: 'الميدان والمهرجانات', description: 'عاصمة ميادين الهجن في إمارة أبوظبي' },
  { term: 'ميدان الشحانية', category: 'الميدان والمهرجانات', description: 'الميدان الرئيسي لسباقات الهجن في دولة قطر' },
  { term: 'ميدان المرموم (التحفة)', category: 'الميدان والمهرجانات', description: 'ميدان المرموم الذكي لسباقات الهجن بدبي' },

  // الأدوار والمصطلحات الميدانية
  { term: 'المالك', category: 'الأدوار والمصطلحات', description: 'مالك المطية وصاحب العزبة المسجلة باسمه المطية' },
  { term: 'المضمر', category: 'الأدوار والمصطلحات', description: 'المدير الفني والمدرب المسؤول عن تجهيز وتضمير وقيادة المطية في الشوط (تكتب بالضاد: المضمر / التضمير، وليس المدمر)' },
  { term: 'درك', category: 'الأدوار والمصطلحات', description: 'الكيلومتر أو الأمتار الأخيرة والحاسمة من خط النهاية في السباق' },
  { term: 'الركاب (الراكب الآلي)', category: 'الأدوار والمصطلحات', description: 'جهاز السوط اللاسلكي الآلي المثبت على ظهر المطية' },
  { term: 'أجزاء الثانية', category: 'الأدوار والمصطلحات', description: 'الأجزاء من المائة المحددة للحسم الزمني (مثل: 9:10:15 = 9 دقائق و10 ثواني و15 جزء)' },
  { term: 'التسعيرة', category: 'الأدوار والمصطلحات', description: 'السعر الإلزامي المسبق لشراء المطايا الفائزة بالمراكز الأولى' },
  { term: 'سبوق', category: 'الأدوار والمصطلحات', description: 'صفة للمطية السريعة المتفوقة' },
];

/**
 * نص الـ Prompt Biasing الموجه لنموذج Whisper / Gemini Transcription
 */
export const WHISPER_PROMPT_BIASING = `
معجم مصطلحات وتفريغ سباقات الهجن الخليجية (Audio Prompt Biasing):
تنبيه صوتي دقيق: كلمة "المضمر" (مدرب ومجهز الهجن، بحرف الضاد "ض"، مثل المضمر سالم بن منانه، المضمر علي الوهيبي) وتفريغها دائماً "المضمر" وليس "المدمر".
الفئات والأعمار: حقايق، لقايا، إيذاع، ثنايا، حول، زمول، مفاريد، ش1، ش2، ش3، ش4، ش5، الشوط الأول، الشوط الثاني، الشوط الثالث، الشوط الرابع، الشوط الخامس.
الجنس ونوع الشوط: بكار مفتوح، بكار عام، قعدان مفتوح، قعدان عام، إنتاج، صعوب، مهجنات، محليات.
الرموز والجوائز: كأس، بندقية، خنجر، شلفة، سيف، درع، الرمز، الشوط الرئيسي، درك، أجزاء الثانية.
الأدوار والصفات: المالك، المضمر، التضمير، تضمير، راعي العزبة، التوقيت، الأب، السلالة، سابقاً، الإنتاج.
السلالات والفحول المشهورة: جبار، ولد لحقه، بعير المختبر، سلفر، بعير ابن قريع، الحريثي العيده، ناصي، شاهين، صوغان، هملول، مياس.
المطايا والملاك والمضمرين: بيه، الحساس، شوق، الصالحية، الذيب، الشاهينية، مياس، الشيخ أحمد بن محمد بن راشد آل مكتوم، راشد سعيد بن مروشد، مانع علي بن حماد الشامسي، سالم سعيد بن منانه، علي بن جميل الوهيبي، محمد بن راشد المري، هجن الرئاسة، هجن العاصفة، هجن الشحانية.
الميادين والمهرجانات: مهرجان ولي العهد السعودي، ميدان الطائف، ميدان الوثبة، ميدان الشحانية، ميدان المرموم، لبرقة، قروب الاتحاد.
صيغة التوقيت الزمني: 9:10:15 (تسع دقائق وعشر ثوان وخمسة عشر جزء)، 9:14:18، 9:22:77، 9:34:69، 6:17:45، 5:48:12.
`;

/**
 * عينات حقيقية للاختبار والتدريب مأخوذة مباشرة من ميادين وقروبات الهجن (مهرجان ولي العهد 2026 وقروب الاتحاد)
 */
export const SAMPLE_RACE_MESSAGES = [
  {
    id: 'sample-real-1',
    title: 'ش 1 كأس بكار مفتوح - (بيه) لـ الشيخ أحمد بن محمد بن راشد (مهرجان ولي العهد)',
    sender: 'قروب الاتحاد 🐪 (+966501234567)',
    group: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
    type: 'text',
    text: `سباق مهرجان ولي العهد للهجن 2026 - السبت 2026/09/12 - رموز الثنايا - ميدان الطايف - مساء
 ش 1 كأس بكار مفتوح 
(بيه) لـ الشيخ أحمد بن محمد بن راشد آل مكتوم 9:10:15 
المضمر : سالم سعيد بن منانه https://youtu.be/qxs6Om332_4
الاب جبار ولد لحقه بعير المختبر`,
    expectedCategory: 'ثنايا بكار مفتوح',
    expectedWinner: 'بيه',
    expectedOwner: 'الشيخ أحمد بن محمد بن راشد آل مكتوم',
    expectedTrainer: 'سالم سعيد بن منانه',
    expectedSire: 'جبار ولد لحقه بعير المختبر',
    expectedHeat: 1,
    expectedTime: '09:10.15',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/qxs6Om332_4',
  },
  {
    id: 'sample-real-2',
    title: 'ش 2 كأس قعدان مفتوح - (الحساس) لـ راشد سعيد بن مروشد',
    sender: 'قروب الاتحاد 🐪 (+966501234567)',
    group: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
    type: 'text',
    text: `سباق مهرجان ولي العهد للهجن 2026 - السبت 2026/09/12 - رموز الثنايا - ميدان الطايف - مساء
 ش 2 كأس قعدان مفتوح 
(الحساس) لـ راشد سعيد بن مروشد 9:14:18 https://youtu.be/SdbCgTn7Nys
الاب سلفر بعير ابن قريع سابقا حاليا عند الرئاسه`,
    expectedCategory: 'ثنايا قعدان مفتوح',
    expectedWinner: 'الحساس',
    expectedOwner: 'راشد سعيد بن مروشد',
    expectedTrainer: '',
    expectedSire: 'سلفر بعير ابن قريع سابقاً حالياً عند الرئاسة',
    expectedHeat: 2,
    expectedTime: '09:14.18',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/SdbCgTn7Nys',
  },
  {
    id: 'sample-real-3',
    title: 'ش 3 كأس بكار عام - (شوق / الصالحية سابقاً) لـ مانع علي بن حماد الشامسي',
    sender: 'قروب الاتحاد 🐪 (+966501234567)',
    group: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
    type: 'text',
    text: `سباق مهرجان ولي العهد للهجن 2026 - رموز الثنايا - ميدان الطايف - مساء
 ش 3 كأس بكار عام 
(شوق) لـ مانع علي بن حماد الشامسي 9:22:77 https://youtu.be/lRF-NE30HTs
الاب الحريثي العيده ولد ناصي المختبر
شوق هيه الصالحيه سابقأ`,
    expectedCategory: 'ثنايا بكار عام',
    expectedWinner: 'شوق (الصالحية سابقاً)',
    expectedOwner: 'مانع علي بن حماد الشامسي',
    expectedTrainer: '',
    expectedSire: 'الحريثي العيده ولد ناصي المختبر',
    expectedHeat: 3,
    expectedTime: '09:22.77',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/lRF-NE30HTs',
  },
  {
    id: 'sample-real-4',
    title: 'ش4 كأس الثنايا قعدان عام - (الذيب) لـ مانع علي محمد حماد الشامسي (لبرقة)',
    sender: 'مراسل لبرقة (+966508877665)',
    group: 'ميدان الطائف - البث المباشر 🎥',
    type: 'text',
    text: `ش4 الذيب لـ مانع علي محمد حمد حماد الشامسي (مهرجان سمو ولي العهد السعودي 12-09-2026م) كأس الثنايا قعدان عام 9:34:69 labregah.com/v/201302 https://youtu.be/SdbCgTn7Nys`,
    expectedCategory: 'ثنايا قعدان عام',
    expectedWinner: 'الذيب',
    expectedOwner: 'مانع علي محمد حمد حماد الشامسي',
    expectedTrainer: '',
    expectedSire: '',
    expectedHeat: 4,
    expectedTime: '09:34.69',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان سمو ولي العهد السعودي 2026',
    videoUrl: 'https://labregah.com/v/201302',
  },
  {
    id: 'sample-real-5',
    title: 'الشوط 3 لقايا بكار مفتوح - (الصالحية) لـ مانع علي الشامسي',
    sender: 'قروب الاتحاد 🐪 (+966501234567)',
    group: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
    type: 'text',
    text: `♻️ الشوط 3..
الصالحيه لـ مانع علي محمد حمد حماد الشامسي
لقايا بكار مفتوح 6:17:45
https://youtu.be/fvoC-HdfqLM
*الاب :- الحريثي العيده*`,
    expectedCategory: 'لقايا بكار مفتوح',
    expectedWinner: 'الصالحية',
    expectedOwner: 'مانع علي محمد حمد حماد الشامسي',
    expectedTrainer: '',
    expectedSire: 'الحريثي العيده',
    expectedHeat: 3,
    expectedTime: '06:17.45',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/fvoC-HdfqLM',
  },
  {
    id: 'sample-real-audio-1',
    title: '🎙️ تسجيل صوتي ميداني مع ضوضاء الرياح - شوط الكأس (محاكاة اللهجة الخليجية السريعة)',
    sender: 'معلق الميدان (+971509988112)',
    group: 'ميدان الطائف - البث المباشر 🎥',
    type: 'audio',
    text: `بسم الله الرحمن الرحيم وعلى بركة الله، نعلن لكم نتيجة الشوط الأول الرئيسي لسن الثنايا بكار مفتوح على كأس مهرجان سمو ولي العهد بميدان الطائف، انتزعت الكأس والمركز الأول بكفاءة عالية وبجدارة المطية "بيه" المملوكة لسمو الشيخ أحمد بن محمد بن راشد آل مكتوم بقيادة المضمر المتألق سالم سعيد بن منانه، والتوقيت الزمني تسع دقائق وعشر ثوان وخمسة عشر جزء من الثانية، وتنحدر من سلالة الأب جبار ولد لحقه بعير المختبر، تهانينا والناموس.`,
    expectedCategory: 'ثنايا بكار مفتوح',
    expectedWinner: 'بيه',
    expectedOwner: 'الشيخ أحمد بن محمد بن راشد آل مكتوم',
    expectedTrainer: 'سالم سعيد بن منانه',
    expectedSire: 'جبار ولد لحقه بعير المختبر',
    expectedHeat: 1,
    expectedTime: '09:10.15',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/3kX1ZBZyuJA',
  },
  {
    id: 'sample-real-audio-2',
    title: '🎙️ تسجيل صوتي ميداني - شوط كأس القعدان (الحساس لـ راشد بن مروشد)',
    sender: 'راعي العزبة (+966551122334)',
    group: 'قروب الاتحاد - تغطية مهرجان ولي العهد 🏆',
    type: 'audio',
    text: `مساكم الله بالخير يا الربع، مبروك لراشد سعيد بن مروشد فوز "الحساس" بكأس الشوط الثاني قعدان مفتوح بزمن تسع دقايق وأربع عشرة ثانية وثمانية عشر جزء، الأب سلفر بعير ابن قريع سابقاً وحالياً عند هجن الرئاسة.`,
    expectedCategory: 'ثنايا قعدان مفتوح',
    expectedWinner: 'الحساس',
    expectedOwner: 'راشد سعيد بن مروشد',
    expectedTrainer: '',
    expectedSire: 'سلفر بعير ابن قريع',
    expectedHeat: 2,
    expectedTime: '09:14.18',
    expectedTrack: 'ميدان الطائف',
    expectedFestival: 'مهرجان ولي العهد للهجن 2026',
    videoUrl: 'https://youtu.be/SdbCgTn7Nys',
  },
];

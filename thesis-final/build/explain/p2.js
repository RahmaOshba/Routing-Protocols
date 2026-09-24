module.exports=[
{n:25,about:'البيئة الموحدة: الإعدادات اللي كل البروتوكولات اتقارنت فيها.',
detail:[
'عشان المقارنة تبقى عادلة، كل البروتوكولات (LEACH وHEED وPEGASIS والـ hybrids وكل نسخك) اشتغلت بنفس الإعدادات بالظبط:',
'100 نود في أرض 100 × 100 متر. الطاقة الأولية 0.5 J لكل نود. رسالة الداتا 2000 بت ورسالة التحكم 200 بت. سرعة 250 kbps. مدى الاتصال 25 متر (بيستخدم في حساب الجيران، degree).',
'مكان الـ BS: في النص (50, 50)، أو بعيد (50, −100)، يعني 100 متر تحت الأرض.',
'نموذج الراديو: first-order بميلين (d² وd⁴)، وd0 ≈ 87.7 m.',
'الـ seed: 12345. ده الرقم اللي بيحدد أماكن النودز العشوائية، فأي حد يشغّل الكود يطلع نفس الشبكة. وفي اختبار الثبات استخدمنا 8 seeds مختلفة.',
'المحاكي: ns-3.41 بـ C++، بنموذج طاقة تحليلي (analytical). يعني الطاقة بتتحسب بالمعادلات مش بطبقات الراديو الحقيقية. ده عكس أول تجربة، وده اللي خلى 100 نود لآلاف الـ rounds ممكنة.'],
say:'All comparisons use exactly these settings: 100 nodes, 100 by 100 metres, 0.5 joules each, and two base-station positions.',
qa:[['ليه 0.5 J بس؟','دي القيمة المعيارية في أبحاث LEACH وHEED. بتخلي الشبكة تموت خلال بضع آلاف من الـ rounds، فنقدر نقيس FND وHND وLND.']]},

{n:26,about:'مقاييس الأداء: FND وHND وLND وPDR.',
detail:[
'FND (First Node Dead): رقم الـ round اللي أول نود ماتت فيه. بيقيس توزيع الحمل: لو الحمل موزّع بالعدل، أول موت هييجي متأخر. وهو أهم مقياس للتغطية، لأن أول ما نود تموت جزء من الأرض بيبطّل يتراقب.',
'HND (Half Nodes Dead): الـ round اللي نص النودز ماتوا فيه. ده العمر "المفيد" للشبكة.',
'LND (Last Node Dead): الـ round اللي آخر نود ماتت فيه، يعني العمر الكلي. ممكن يبقى مضلّل: لو فيه نودز عايشة بس مش بتبعت حاجة (silent)، الـ LND هيطلع كبير بالغلط.',
'PDR (Packet Delivery Ratio): الرسايل اللي وصلت ÷ الرسايل اللي اتولّدت، طول عمر الشبكة. بيقيس الاعتمادية.',
'وكمان بنعرض إجمالي الرسايل اللي وصلت (delivered packets). ده اللي بيكشف النودز "العايشة بس ساكتة" اللي بتخلي الـ LND شكله أحسن من الحقيقة.'],
say:'FND measures load balance and coverage, HND the useful lifetime, LND the total lifetime, and PDR the reliability. We also report delivered packets, because LND alone can be inflated by silent nodes.',qa:[]},

{n:27,about:'فاصل القسم الرابع: إعادة بناء البروتوكولات الموجودة.',detail:['الخطوات: المنشور ← بإعدادات البحث ← في البيئة الموحدة ← المحسّن.'],say:'Next, reproducing the existing protocols.',qa:[]},

{n:28,about:'الخطوة 1 (paper-exact): نتايج البحث الأصلي مقابل نتايجنا بنفس إعداداته.',
detail:[
'الهدف هنا نتأكد إن الكود بتاعنا صح، مش إننا نقارن البروتوكولات ببعض. عمود "Published LND" هو اللي في البحث الأصلي، والباقي نتايجنا.',
'PEGASIS: البحث 2192 وإحنا 2186. الفرق 0.3% بس، وده تطابق ممتاز (والـ FND والـ HND بفرق أقل من 3.1%).',
'LEACH: البحث 1312 وإحنا 1327، يعني الفرق 1.1%. والـ FND عندنا 1035 والبحث 932.',
'HEED وSH-LEACH: البحث حاطط رسم بس من غير أرقام (graph only). وHEED اشتغل بـ 500 نود زي البحث.',
'ملاحظة: وإحنا بنراجع الأكواد قدام الأبحاث لقينا غلطة في طريقة حساب الـ LND: لو المحاكاة وقفت عند آخر round والنودز لسه عايشة، كان بيتكتب آخر موت على إنه LND. اتصلّحت، ودلوقتي كل بروتوكول بيشتغل لحد ما آخر نود تموت فعلًا.',
'H-LEACH: البحث بيقول ≈ 4312، وإحنا 1210، ده بعد ما حطينا حل احتياطي عشان يشتغل أصلًا، لأن الـ gate بتاعته بيعمل deadlock.',
'EECH-HEED: أقل من البحث (2200 ← 1129) لأن الـ adaptive sensing بتاعه، يعني النود مابتبعتش غير لما القراية تتغير، ماكانش اتنفّذ في المرحلة دي.',
'ملاحظة مهمة: أرقام الأبحاث ماينفعش تتقارن ببعض مباشرة، لأن كل بحث استخدم إعدادات مختلفة.'],
say:'First we reproduced each protocol in its own paper\'s settings. PEGASIS matched its LND within 0.3 percent and LEACH within 1.1 percent, which validates our implementation.',qa:[]},

{n:29,about:'الخطوة 2: كل البروتوكولات في البيئة الموحدة.',
detail:[
'دلوقتي كلهم في نفس الأرض ونفس الراديو ونفس مكان الـ BS، فأي فرق سببه البروتوكول نفسه.',
'LEACH: FND 1383 وLND 1842 وPDR 99.40%.',
'HEED: FND 634 بس! أول نود بتموت بدري جدًا بسبب رسايل التفاوض كل round، بس الـ PDR بتاعه عالي (99.68%). وHEED (fairness) قريب منه (743).',
'PEGASIS: أطول LND (3504) بسبب السلسلة والمسافات القصيرة، بس FND 1324.',
'SH-LEACH: FND 1440 وLND 1604. وH-LEACH (بعد التعديل عشان يشتغل): FND 2177 وLND 2305. وEECH-HEED: FND 1653 بس PDR 91.68%.',
'الرسم البياني بيحط FND وHND وLND جنب بعض لكل بروتوكول.'],
say:'In the unified environment, differences come only from the algorithms. HEED dies earliest because of its negotiation overhead; PEGASIS has the longest last-node lifetime.',qa:[]},

{n:30,about:'ليه الأرقام اتغيرت بين إعدادات البحث والبيئة الموحدة.',
detail:[
'الرسم بيقارن LND لنفس البروتوكول مرتين: بإعدادات بحثه (Paper-exact) وفي البيئة الموحدة (Unified). الخوارزمية نفسها في العمودين، اللي اتغير البيئة بس.',
'الأسباب: (1) حجم الأرض اتغير من 50×50 لـ 100×100 متر. (2) مكان الـ BS اتغير من بعيد للنص. (3) نموذج الراديو اتغير من single-term لـ two-slope. (4) حجم الرسالة والطاقة الأولية اتغيروا (HEED مثلًا كان 2 J وبقى 0.5 J، وعشان كده الـ LND بتاعه قلّ).',
'الرسالة: ماينفعش تقارني رقم من بحث برقم من بحث تاني. لازم الكل يبقى في نفس البيئة.'],
say:'The algorithm is identical in both bars; only the environment changed. That is why published numbers cannot be compared directly.',
qa:[['يعني إيه single-term → two-slope؟','بعض الأبحاث القديمة حسبت تكلفة الإرسال بمعادلة واحدة (مثلًا d² بس لكل المسافات). إحنا استخدمنا الميلين: d² للمسافات القصيرة وd⁴ للطويلة، زي Heinzelman 2002. ده بيغيّر الأرقام خصوصًا لما المسافات تكون طويلة.']]},

{n:31,about:'تحسين الـ hybrids اللي في الأبحاث: التصليحات اللي عملتيها.',
detail:[
'SH-LEACH: صلّحتي المعادلة بحيث المضاعفة تبقى متكررة زي HEED الحقيقي، ونزّلتي Cprob من 0.10 لـ 0.03. النتيجة: HND وLND وPDR زادوا (PDR بقى 99.79%)، بس FND قلّ 13% (من 1440 لـ 1247)، لأن عدد الـ clusters بقى أقل وحجمها أكبر.',
'H-LEACH: خففتي شرط الطاقة من "أكبر من 1.0 × المتوسط" لـ "أكبر من 0.8 × المتوسط". كده القاعدة اللي بتعتمد على الطاقة بقت هي اللي بتقرر فعلًا، والنتيجة FND وHND وLND زادوا من 7.8% لـ 8.6% من غير ما الـ PDR يقل (FND 2347).',
'EECH-HEED (للسياق بس): لما ضفنا الـ adaptive threshold sensing بتاعه، طلع أطول عمر رقمي (LND 3808). بس ده لأن النودز بتبعت أقل، مش لأن الـ clustering أحسن. فحطيناه للسياق ومش بنقارن نفسنا بيه مباشرة.'],
say:'I corrected both literature hybrids: a true iterative doubling for SH-LEACH and a relaxed 0.8 energy gate for H-LEACH, which improved its lifetime by about 8 percent.',
qa:[['ليه EECH-HEED مش المنافس المباشر مع إن LND بتاعه 3808؟','لأنه بيكسب عمر عن طريق إنه يقلل عدد الرسايل (مابيبعتش غير لما القراية تتغير). ده بيغيّر التطبيق نفسه مش الـ clustering. لو طبّقنا نفس الفكرة على أي بروتوكول تاني عمره هيزيد برضو.']]},

{n:32,about:'الدروس اللي اتنقلت للبروتوكول الجديد.',
detail:[
'1) اختيار CH أحسن لوحده مش كفاية (HEED اختار كويس ومات بدري).',
'2) إعادة الـ clustering كل round بتضيّع طاقة (رسايل تحكم).',
'3) إعادة استخدام الـ cluster فترة أطول بتوفّر، بس بتخلي الـ clusters قديمة (stale) ممكن الـ CH فيها يموت.',
'4) موت الـ CH بيسيب الـ cluster كله من غير حد يوصّل الداتا بتاعته.',
'5) إرسال الـ CH للـ BS مباشرة غالي لما الـ BS يبقى بعيد.',
'كل درس من دول بقى آلية في البروتوكول المقترح.'],
say:'These five lessons drove every version of my protocol.',qa:[]},

{n:33,about:'فاصل القسم الخامس: البروتوكول المقترح من v1 لـ v7.2.',detail:['فكرة واحدة في كل نسخة، وبنقيس كل مرة.'],say:'Now the evolution of the proposed protocol.',qa:[]},

{n:34,about:'خريطة التطور: كل النسخ ورا بعض.',
detail:[
'v1: اختيار CH زي HEED والانضمام زي LEACH. v2: زودنا عدالة في الدوران. v3: معادلة واحدة وإعادة استخدام. v4: interval 15. v5: Backup CH. v6: سلسلة CH-to-CH. v7: سلسلة + إصلاح. v7.1/v7.2: multihop. v8: وقاية + إرسال مباشر. v8-Chain: توصيل على حسب الطاقة.',
'السطر اللي تحت بيلخّص القصة: الاختيار ← إعادة الاستخدام ← الإصلاح ← التوصيل ← الوقاية + التوصيل المتأقلم.'],
say:'Selection, then reuse, then recovery, then relay, and finally prevention with an adaptive relay.',qa:[]},

{n:35,about:'v1 وv2: الأساس الهجين وتشخيص المشكلة.',
detail:[
'الرسم: الطاقة المتبقية ← اختيار CH بطريقة HEED ← الانضمام لأقرب CH بطريقة LEACH ← الـ CH يبعت للـ BS.',
'v1: FND 330 وLND 1318 وPDR 99.74%. وv2 زود عقوبة عدالة (λ = 0.1) عشان نفس النود ماتبقاش CH كتير: FND 345 وLND 1393 وPDR 99.79%.',
'التشخيص: الـ PDR عالي جدًا بس أول نود بتموت بدري جدًا. السبب إن مفاوضات HEED المتكررة بتتدفع كاملة كل round، سواء الشبكة اتغيرت أو لأ. يعني المشكلة في الـ overhead، مش في جودة الـ CH.'],
say:'v1 and v2 had excellent PDR but very early first death. The root cause was the full HEED negotiation paid every round, not the quality of the cluster heads.',qa:[]},

{n:36,about:'v3: إعادة التصميم من الجذر. أكبر قفزة.',
detail:[
'المعادلة: score = (E / E0) × (1 + degree / maxDegree). يعني النقاط = نسبة الطاقة المتبقية × (1 + نسبة عدد الجيران). النود اللي طاقتها عالية وجيرانها كتير بتاخد نقاط أعلى.',
'الاحتمال: P(CH) = min(1, T(r) × score). يعني threshold بتاع LEACH مضروب في النقاط.',
'التلات أفكار: (1) مرة واحدة من غير تفاوض متكرر (single pass). (2) الـ CHs بتتحسب مرة كل 5 rounds (setup interval = 5)، وفي الـ rounds التانية الـ clusters بتتعاد. (3) الـ threshold T(r) والـ epoch بتوع LEACH بيضمنوا إن الدوران عادل.',
'النتيجة: LND زاد 94% (من 1393 لـ 2703)، وأول نود بتموت متأخر 5 مرات (من 345 لـ 1730). بس الـ PDR نزل لـ 97.72%.'],
say:'v3 was the decisive step: one scoring pass instead of negotiation, and clusters reused for five rounds. LND almost doubled and first death came five times later.',
qa:[['ليه 5 rounds بالذات؟','جربنا 5 و10 و15. 5 أدت أحسن توازن بين توفير رسايل الـ setup وإن الـ clusters ماتبقاش قديمة. 15 ضرّت الـ PDR (v4).']]},

{n:37,about:'v4 وv5: الـ interval والـ Backup CH.',
detail:[
'v4: كبّرنا الـ interval من 5 لـ 15. النتيجة إن الـ PDR نزل من 97.72% لـ 94.67% والـ FND نزل لـ 1513. السبب: لو الـ CH مات في نص الـ interval، الـ cluster بيفضل من غير CH فترة أطول.',
'v5: Backup CH. العضو اللي معاه أعلى طاقة بيتحدد كنائب وقت الـ setup، من غير أي رسايل زيادة. ولو الـ CH مات، النائب بيترقّى. الـ PDR رجع فوق 97%.',
'v5-exp: interval 5 + backup + إصلاح الـ cluster (cluster repair): PDR 98.27%. وبـ interval 10 الـ PDR بقى 97.94%.'],
say:'Longer reuse hurt PDR because a dead CH strands its cluster for longer. The backup CH, chosen at setup with zero extra messages, brought PDR back above 97 percent.',qa:[]},

{n:38,about:'v6 وv7: سلسلة الـ CHs والإصلاح.',
detail:[
'v6: الـ CHs بتترتب على حسب بعدها عن الـ BS، والأقرب بيبقى gateway. كل CH بيبعت للي بعده في السلسلة لحد الـ gateway، والـ gateway بيبعت للـ BS.',
'v7: لو CH مات، النائب اللي اترقّى بياخد مكانه في السلسلة (chain repair). الإصلاح نجح 16 من 16 مرة والـ BS في النص، و21 من 21 والـ BS بعيد.',
'النتايج: في النص v7 عمل FND 1551 وPDR 98.43%. وبعيد عمل FND 1266 وPDR 98.14%.',
'الملاحظة: السلسلة رفعت الـ PDR، بس لما تبقى شغالة على طول بتزوّد تكلفة التوصيل لما الـ BS قريب. فمفيش شكل ثابت ينفع في كل الحالات.'],
say:'The chain raised PDR and repair worked in every case, but an always-on chain adds relay cost when the base station is near.',qa:[]},

{n:39,about:'v7.1 وv7.2: شجرة multihop.',
detail:[
'بدل gateway واحد، كل CH بيبعت لأقرب CH أقرب منه للـ BS. كده مفيش عنق زجاجة (bottleneck) عند gateway واحد.',
'v7.1 (interval 5): أعلى PDR من v1 لـ v7 (98.49%)، بس الـ FND 1491.',
'v7.2 (interval 10): LND أكتر (2241) بس PDR أقل (97.88%). ده بيأكد إن معدّل الـ setup ده "رافعة" منفصلة عن الاختيار والشكل.'],
say:'A multihop tree removes the single-gateway bottleneck and gave the best PDR of v1 to v7.',qa:[]},

{n:40,about:'نظرة واحدة على كل النسخ من v1 لـ v7.2 (الـ BS في النص).',
detail:['الرسم بيحط FND وHND وLND لكل النسخ. الواضح إن v3 هي القفزة الكبيرة، وإن مفيش نسخة بعدها كسبت v3 في الـ LND. الأرقام في السلايدات اللي فاتت.'],
say:'This chart summarises v1 to v7.2: v3 is the big jump, and later versions traded lifetime for reliability.',qa:[]},

{n:41,about:'فين كانت النسخ لحد v7.2: الـ PDR والتنازلات.',
detail:[
'رسم الـ PDR لكل النسخ. التنازلات: v3 أحسن LND بس PDR أقل. v1/v2 أحسن PDR بس عمر قصير جدًا. v7/v7.1 أحسن توازن بس FND ≤ 1551.',
'الهدف للتصميم النهائي: أول موت يتأخر والـ PDR يعلى في نفس الوقت.'],
say:'So far there was always a trade-off. The goal of the final design was a later first death and a higher PDR at the same time.',qa:[]},

{n:42,about:'فاصل القسم السادس: التصميم النهائي v8-Chain.',detail:['العنوان الفرعي: امنع موت الـ CH، وخفف عن الـ CHs، ووصّل عن طريق CH تاني بس لما ده يستاهل.'],say:'Now the final design, v8-Chain.',qa:[]},

{n:43,about:'اللي لقيناه في v5b: ليه الـ LND بتاعه (3203) مش حقيقي.',
detail:[
'v5b كان عنده أعلى LND (3203)، وكان شكله الأحسن. بس لما دقّقنا طلع إنه وصّل 59 رسالة بس في آخر 1038 round. ولما الـ CH مات، ولا ترقية للنائب نجحت (0 من 20).',
'المشكلة 1، النودز الساكتة: v5b كان رافض يستخدم أي نود طاقتها أقل من 5% من E0 (0.025 J) كثابت. في آخر التشغيل كل النودز بقت تحت الرقم ده، فالأعضاء الضعاف بقوا من غير cluster، فبطّلوا يبعتوا، فماماتوش. النتيجة LND كبير وداتا تقريبًا صفر.',
'المشكلة 2، rounds من غير CH: لما كل النودز العايشة تكون بقت CH خلاص في الـ epoch الحالي، محدش بيبقى مؤهل. حصل 998 round من غير أي CH (زي rounds 196–200 والـ 100 نود عايشين).'],
say:'v5b looked best with LND 3203, but it delivered only 59 packets in its last 1038 rounds. Nodes stayed alive because they were silent, and 998 rounds had no cluster head at all.',
qa:[['يعني v5b غلط؟','الـ LND بتاعه صح حسابيًا، بس مضلّل. النودز عايشة لأنها مش بتشتغل. عشان كده بنقيس مع الـ LND الـ PDR وعدد الرسايل اللي وصلت.']]},

{n:44,about:'آليات v8: التحسينات الخمسة (I1–I5) والتصليح.',
detail:[
'I1، تصليح نهاية الـ epoch: لو محدش مؤهل، يبدأ epoch جديد على طول. كده عمرنا ما يبقى عندنا صفر CHs.',
'I2، تسليم استباقي: الـ CH اللي مش هيقدر يكمّل الـ round بيسلّم الدور لأقوى عضو قبل ما يموت.',
'I3، إعادة انضمام اليتامى: أعضاء الـ CH الميت بينضموا لأقرب CH عايش.',
'I4، الإرسال المباشر للـ BS: النود اللي أقرب للـ BS من الـ CH بتاعها بتبعت للـ BS على طول.',
'I5، انتخاب بشرط الطاقة: ماينفعش تبقى CH غير النود اللي طاقتها ≥ المتوسط.',
'Fix، اختبار الطاقة النسبي: الـ 5% بقت من المتوسط الحالي للشبكة مش من E0. كده الـ backup بقى يشتغل تاني في آخر التشغيل.',
'كل آلية ممكن تتقفل وقت الـ compile (بالـ #define). وده اللي عملنا بيه الـ ablation.'],
say:'v8 adds five mechanisms, I1 to I5, and a relative low-energy test. Each can be switched off at compile time, which is how we measured their individual effect.',qa:[]},

{n:45,about:'حماية الـ CH قبل الفشل وبعده.',
detail:[
'خط الدفاع 1، الوقاية (جديدة، I2): قبل مرحلة إرسال الداتا، الـ CH بيقارن طاقته بشغل الـ round ده: عدد الأعضاء × (استقبال + تجميع) + إرسال للـ hop اللي بعده. لو مش هيكفّي بيسلّم الدور لأقوى عضو وهو لسه عايش، ومفيش رسايل بتضيع.',
'خط الدفاع 2، الإصلاح (من v5 بعد التصليح): لو الـ CH مات فجأة برضو، النائب بيترقّى والأعضاء بيتوصلوا من تاني في نفس الـ round. الاختبار النسبي هو اللي خلاه يشتغل في آخر التشغيل.',
'الأرقام: 26 تسليم استباقي (الـ BS في النص)، و18 ترقية نجحت و11 اترفضت (النائب نفسه كان ضعيف).',
'v5 كان عنده خط الدفاع التاني بس.'],
say:'Two lines of defence: first, the CH hands over before it dies; second, if it still dies, the backup is promoted in the same round.',qa:[]},

{n:46,about:'v8-Chain: التوصيل على حسب الطاقة. وده قلب الفكرة الجديدة.',
detail:[
'القاعدة: الـ CH يوصّل عن طريق CHj لو: تكلفة الإرسال لـ CHj + تكلفة استقبال وتجميع CHj < تكلفة الإرسال المباشر للـ BS. يعني بيختار الأرخص.',
'الـ BS في النص: كل الـ CHs على بعد حوالي 50 متر أو أقل من الـ BS (منطقة d²). التوصيل عمره ما بيوفّر، فمفيش relays خالص، والبروتوكول بيبقى زي v8 بالظبط.',
'الـ BS بعيد (50, −100): المسافة من الـ CH للـ BS بين 100 و200 متر (منطقة d⁴، غالية جدًا). القفزات القصيرة بين الـ CHs أرخص بكتير، فالـ CHs بتعمل سلسلة لوحدها (4,710 relay). المسار بيتبني من جديد كل round، فأي CH جديد بياخد مكان اللي قبله.',
'الترتيب: الـ CHs بتتعالج من الأبعد للأقرب، عشان كل CH يعرف التكلفة الحقيقية للي بعده.',
'الميزة: قاعدة واحدة بتخلي البروتوكول يتأقلم مع مكان الـ BS من غير أي parameter.'],
say:'A cluster head relays through another cluster head only if that is cheaper than sending directly. With a central base station this never happens; with a far base station a chain forms on its own.',
qa:[['ليه مابتعمليش سلسلة دايمًا زي v7؟','لأن لما الـ BS قريب السلسلة بتصرف أكتر (استقبال وتجميع زيادة عند كل CH). القاعدة بتقرر كل round لكل CH هل التوصيل أرخص فعلًا ولا لأ.']]},

{n:47,about:'الـ Flowchart بتاع v8-Chain.',
detail:[
'الرسم متقسم لمرحلتين. مرحلة الـ SETUP (مرة كل 5 rounds): (1) لو كل النودز العايشة خدت دورها خلاص يبدأ epoch جديد [I1]. (2) المؤهلين: عايشين، ومابقوش CH في الـ epoch ده، وطاقتهم ≥ متوسط الشبكة [I5]. (3) حساب النقاط والاحتمال [LEACH + HEED]. (4) الـ CHs تعلن عن نفسها وكل نود تنضم لأقرب CH [LEACH]. (5) كل CH يحدد نائب = العضو اللي طاقته أعلى [v5].',
'مرحلة الـ STEADY-STATE (كل round): (1) أعضاء الـ CH الميت ينضموا لأقرب CH عايش [I3]. (2) كل CH يختار الـ hop اللي بعده: يوصّل عن طريق CH أقرب للـ BS بس لو أرخص من المباشر [Chain]. (3) سؤال: هل طاقة الـ CH أقل من شغل الـ round ده؟ لو آه يسلّم الدور لأقوى عضو وهو عايش [I2]. (4) سؤال لكل عضو: هل المسافة للـ BS ≤ المسافة للـ CH؟ لو آه يبعت للـ BS مباشرة [I4]، ولو لأ يبعت للـ CH. (5) الـ CHs (الأبعد عن الـ BS الأول) تجمّع داتا أعضائها + الداتا اللي جاية لها من CHs تانية، وتبعت رسالة واحدة للـ hop اللي بعده أو للـ BS [Chain]. (6) لو CH مات فجأة: النائب يترقّى والأعضاء يتوصلوا، وياخد مكان الميت في مسار التوصيل (باختبار الطاقة النسبي) [v5 + fix]. (7) تحديث الطاقة وFND وHND وLND والـ PDR. ولو لسه فيه نودز عايشة نروح للـ round اللي بعده.',
'الألوان: الرمادي موروث من LEACH وHEED وv3 وv5، والأخضر جديد في v8، والبرتقاني جديد في v8-Chain.'],
say:'The flowchart shows one round. Grey steps are inherited, green are new in v8, and orange is new in v8-Chain.',qa:[]},

{n:48,about:'شكل الشبكة في أول round (حالة حقيقية من المحاكاة، seed 12345).',
detail:['الصورة مش رسم توضيحي. دي أماكن النودز والـ CHs الحقيقية في أول round: الـ CHs متميّزة، وكل عضو متوصل بالـ CH بتاعه، والـ BS موجود. بتورّي إن الـ clusters متوزّعة على الأرض كلها.'],
say:'This is the real network state in round one, not an illustration.',qa:[]},
];

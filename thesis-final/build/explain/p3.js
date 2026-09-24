module.exports=[
{n:49,about:'فاصل القسم السابع: النتايج.',detail:['هنعرض النتايج لما الـ BS في النص ولما يبقى بعيد، وبعدين الـ ablation، والثبات، والمقارنة الشاملة.'],say:'Now the results.',qa:[]},

{n:50,about:'النتايج والـ BS في نص الأرض.',
detail:[
'الجدول: v3 (FND 1730 وPDR 97.72%)، وv5b (LND 3203* بس ده منفوخ بسبب النودز الساكتة)، وv7 (FND 1551 وPDR 98.43%)، وv7.1 (FND 1491 وPDR 98.49%)، وv8-Chain (FND 2621 وHND 2711 وLND 2756 وPDR 99.27%).',
'+69%: أول نود بتموت متأخرة 69% عن v7 (من 1551 لـ 2621)، يعني 1070 round زيادة.',
'99.27%: أعلى PDR بين كل البروتوكولات اللي أول نود فيها بتعيش بعد round 2000.',
'+33%: وصّلنا رسايل أكتر بـ 33% من v5b بنفس الطاقة الكلية (50 J = 100 نود × 0.5 J): من 201,505 لـ 268,610 رسالة. ودي أقوى حجة إن الـ LND بتاع v5b مش حقيقي.',
'ملاحظة: والـ BS في النص v8-Chain = v8 بالظبط، لأن مفيش ولا relay حصل.'],
say:'With the base station at the centre, v8-Chain delays the first node death by 69 percent compared with v7, reaches 99.27 percent PDR, and delivers 33 percent more packets than v5b with the same total energy.',
qa:[['ليه الـ LND بتاعك (2756) أقل من v5b (3203)؟','لأن الـ LND بتاع v5b جاي من نودز عايشة بس ساكتة (59 رسالة بس في آخر 1038 round). إحنا وصّلنا 268,610 رسالة مقابل 201,505، وده معناه إن طاقتنا اتصرفت في شغل حقيقي.']]},

{n:51,about:'النتايج والـ BS بعيد (50, −100).',
detail:[
'v6 (سلسلة): FND 1266 وPDR 97.08%. وv7 (سلسلة + إصلاح): FND 1266 وHND 1891 وLND 1976 وPDR 98.14%.',
'v8 (مباشر من غير relay): FND 1471 بس LND 1716. الإرسال المباشر من بعيد غالي.',
'v8-Chain: FND 1716 وHND 1886 وLND 1956 وPDR 99.07%.',
'+36%: FND أحسن من v7 (من 1266 لـ 1716). و+0.93 نقطة في الـ PDR.',
'القراية الأمينة: HND وLND قريبين جدًا من v7 (الفرق أقل من 1%: 1886 و1956 مقابل 1891 و1976)، يعني متساويين مش أحسن. v8-Chain بيكسب في أول موت وفي الاعتمادية.'],
say:'With a far base station, direct-only v8 loses lifetime; the energy-aware relay closes the gap to the v7 chain while keeping a 36 percent later first death and a higher PDR. HND and LND are equal to v7, not better.',qa:[]},

{n:52,about:'الشبكة مع الوقت والـ BS في النص (لقطات من المحاكاة).',
detail:[
'4 لقطات: round 1 (الكل عايش)، وround 1300 (نص البطاريات اتصرف والـ CHs بتتبدل)، وround 2621 (أول نود ماتت، FND)، وround 2740 (قرب النهاية).',
'الألوان: الأحمر الغامق بطارية مليانة، والفاتح بطارية قربت تخلص، وعلامة x رمادي نود ميتة.',
'الرسالة: البطاريات بتفضى بالتساوي. الـ 100 نود كلهم لسه عايشين في round 2621، وآخر نود بتموت بعدها بـ 135 round بس. ده معناه إن الحمل متوزّع بعدل.'],
say:'Batteries drain evenly: all 100 nodes are still alive at round 2621, and the last one dies only 135 rounds later.',qa:[]},

{n:53,about:'الشبكة مع الوقت والـ BS بعيد.',
detail:['نفس اللقطات بس والـ BS عند (50, −100). هتلاحظي إن الـ CHs بتوصّل الداتا لبعض ناحية الـ BS (التوصيل على حسب الطاقة). أول نود ماتت في round 1716.'],
say:'Same view with the far base station: cluster heads pass data to each other towards the sink.',qa:[]},

{n:54,about:'مقارنة الـ BS في النص والـ BS بعيد: نفس الكود، الـ BS بس اللي اتحرك.',
detail:[
'رسمين: الشمال والـ BS في النص، واليمين والـ BS بعيد، لـ v6 وv7 وv8 وv8-Chain.',
'في النص: v8 وv8-Chain تقريبًا نفس الأرقام (2621 و2711 و2761/2756)، لأن مفيش relay.',
'بعيد: v8 بيقع (LND 1716)، وv8-Chain بيرجع قريب من v7 في LND وبيكسبه في FND.',
'الخلاصة: إعداد واحد (v8-Chain) بيكسب أو بيتعادل في الحالتين.'],
say:'Same code, only the base station moves. v8-Chain equals v8 at the centre and recovers the chain\'s lifetime when the base station is far.',qa:[]},

{n:55,about:'الـ Ablation: أنهي آلية أهم؟',
detail:[
'الفكرة: نقفل آلية واحدة كل مرة (leave-one-out) ونشوف الـ FND بيقل قد إيه (والـ BS في النص).',
'v8 كامل: 2621. من غير I1: 2621، ومن غير I3: 2621 (دول شبكات أمان مابتتفعلش غير في حالات نادرة). من غير I2: 2585، والـ PDR بيقل 0.24 نقطة. من غير I4: 1821، ودي أكبر خسارة، يعني الإرسال المباشر للقريبين من الـ BS هو أهم آلية. من غير I5: 2171، وده التاني في الأهمية. التصليح النسبي لوحده (Threshold fix only): 1730.',
'الخلاصة: I4 أكبر تأثير، وبعده I5. وI2 بتزوّد الـ PDR، وI1 وI3 شبكات أمان.'],
say:'Removing one mechanism at a time shows that direct-to-BS has the largest effect, followed by the energy gate. I2 improves PDR, and I1 and I3 are safety nets.',
qa:[['لو I1 وI3 مالهمش تأثير ليه موجودين؟','لأنهم بيمنعوا حالات فشل نادرة (صفر CH، أو أعضاء يتامى). في الـ seed ده ماحصلتش، بس في شبكات تانية ممكن تحصل، وتكلفتهم تقريبًا صفر.']]},

{n:56,about:'الثبات: 8 أشكال شبكات عشوائية.',
detail:[
'شغّلنا v5b وv8-Chain على 8 seeds (12345 و1 و7 و42 و99 و2024 و31337 و555)، يعني 8 توزيعات مختلفة للنودز.',
'في النص: متوسط v8-Chain: FND 2618 وPDR 99.25%، مقابل v5b: FND 1688 وPDR 97.56%.',
'بعيد: متوسط v8-Chain: FND 1743 وPDR 99.05%، مقابل v5b: FND 1152.',
'الترتيب ثابت في كل الشبكات. والـ BS بعيد، v8-Chain ساوى أو كسب الـ LND بتاع v7 (1976) في 6 من 8.'],
say:'Across eight random topologies the ranking never changes, so the gain is not an artefact of one layout.',qa:[]},

{n:57,about:'المقارنة الشاملة: أحسن واحد من كل عيلة (الـ BS في النص).',
detail:[
'الرسم فيه LEACH وHEED وPEGASIS وSH-LEACH+ وH-LEACH+ (+ يعني النسخة المحسّنة) وv3 وv7 وv7.1 وv8-Chain.',
'v8-Chain عنده أحسن FND في الكل (2621)، وH-LEACH+ تاني (2347).',
'PEGASIS عنده LND أطول (3504) بسبب السلسلة الواحدة والقفزات القصيرة، بس أول نود فيه بتموت قبلنا بحوالي 1300 round (1324).'],
say:'v8-Chain has the latest first node death of all protocols. PEGASIS keeps a longer last-node lifetime, but its first node dies about 1300 rounds earlier.',
qa:[['PEGASIS عنده LND أحسن، ليه مش الأحسن؟','لأن FND بتاعه 1324 بس، يعني أجزاء من الأرض بتبطّل تتراقب بدري جدًا. وكمان فيه تأخير كبير وsingle point of failure. إحنا بنعتبر FND والـ PDR أهم للتغطية والاعتمادية.']]},

{n:58,about:'المقارنة الشاملة: الاعتمادية (PDR).',
detail:[
'LEACH (99.40%) وPEGASIS (99.42%) وHEED (99.68%) وSH-LEACH+ (99.79%) بيوصّلوا أكتر شوية من v8-Chain (99.27%)، بس أول نود فيهم بتموت قبلنا بـ 1,200 لـ 2,000 round.',
'بين البروتوكولات اللي أول نود فيها بتعيش بعد round 2000، v8-Chain عنده أعلى PDR. ومهم تقوليها بأمانة: إحنا مش الأعلى في الـ PDR بشكل مطلق، بس الفرق أقل من نص نقطة.',
'مهم تقوليها بأمانة: إحنا مش الأعلى في الـ PDR بشكل مطلق.'],
say:'LEACH, PEGASIS, HEED and improved SH-LEACH deliver up to half a point more, but their first node dies 1,200 to 2,000 rounds earlier. Among protocols whose first node lives past round 2000, v8-Chain has the highest PDR.',qa:[]},

{n:59,about:'أهم الاستنتاجات (5 نقاط).',
detail:[
'1) التصميم أهم من ضبط الأرقام: أكبر قفزتين جم من v3 (المعادلة الواحدة + إعادة الاستخدام) ومن v8 (حماية الـ CH وتخفيف الحمل عنه). تغيير الـ interval لوحده ماعملش كده.',
'2) امنع الأول وبعدين صلّح: التسليم قبل ما الـ CH يموت (I2) + الـ backup بعد ما يموت، الاتنين مع بعض بيخلوا الـ clusters شغالة والرسايل ماشية.',
'3) مش كل رسالة لازم تعدّي على CH: الإرسال المباشر للنودز القريبة من الـ BS هو أكبر مساهم في العمر.',
'4) التوصيل بالطاقة مش بقاعدة ثابتة: قرار لكل CH على حسب الطاقة أحسن من سلسلة ثابتة (صفر relays في النص، وسلسلة لما الـ BS بعيد).',
'5) اقري الـ LND مع التوصيل: الـ LND الطويل ممكن يخبّي نودز ساكتة (v5b)، والـ FND والـ PDR وعدد الرسايل بيكشفوه.'],
say:'Five findings: architecture beats tuning; prevent, then repair; not every packet needs a cluster head; relay by energy, not by rule; and always read LND together with delivery.',qa:[]},

{n:60,about:'التوصيات: تستخدمي أنهي إعداد وإمتى.',
detail:[
'الـ sink جوه الأرض أو قريبة: v8-Chain، عشان أحسن FND وPDR 99.27%، وبيشتغل زي v8.',
'الـ sink بعيدة عن الأرض: v8-Chain، عشان أحسن FND وPDR والـ BS بعيد، والـ relay بيتكوّن لوحده.',
'أبسط اختيار كويس: v7.1 أو v5-exp (interval 5)، بـ PDR حوالي 98.3–98.5% من غير لوجيك زيادة.',
'لما تحكمي على العمر: استخدمي FND + PDR + عدد الرسايل اللي وصلت، لأن الـ LND لوحده ممكن يضلّل.'],
say:'v8-Chain is recommended for both near and far sinks; v7.1 is the simplest good alternative.',qa:[]},

{n:61,about:'حدود الدراسة والشغل الجاي.',
detail:[
'الحدود: (1) محاكاة بس (ns-3، 100 نود، راديو تحليلي). (2) مكانين للـ BS بس، وحجم أرض واحد، و8 أشكال شبكات. (3) مكسب الإرسال المباشر بيعتمد على إن الـ sink تكون قريبة. (4) موت الـ CH بسبب خلصان الطاقة بس، مش موت أكتر من نود في نفس الوقت ولا نود خبيثة.',
'الشغل الجاي: (1) نجرّب على hardware أو SDR testbed. (2) نغيّر مكان الـ BS وحجم الأرض وعدد النودز. (3) نقارن قاعدة التوصيل الـ greedy بشجرة أقل طاقة مثالية (optimal minimum-energy tree). (4) نقيّم البروتوكول مع طبقة التشفير الهجين تحت هجوم.',
'ومن أول تجربة: ممكن نزود sleep للراديو في المحاكاة بالطبقات (802.15.4) عشان نقيس تأثير الـ idle listening على البروتوكول الكامل.'],
say:'This is a simulation study with two base-station positions. Next steps are hardware validation, wider parameter sweeps, an optimal relay tree, and evaluation with the hybrid-cryptography layer.',qa:[]},

{n:62,about:'الخلاصة.',
detail:[
'اتعاد بناء 5 بروتوكولات موجودة بشكل عادل في بيئة واحدة، واتصلح اتنين hybrids منشورين.',
'البروتوكول الأصلي اتطور آلية واحدة كل مرة، من v1 لـ v8-Chain.',
'v8-Chain بيحمي الـ CHs قبل الفشل وبعده، وبيخلي النودز القريبة من الـ sink تبعت مباشرة، وبيقصر دور الـ CH على النودز القوية، وبيوصّل عن طريق CH تاني بس لما ده يوفّر طاقة.',
'الأرقام: في النص FND 2621 وPDR 99.27%، وبعيد FND 1716 وPDR 99.07%. إعداد واحد للحالتين.'],
say:'In summary, one configuration of v8-Chain gives the latest first node death and very high reliability for both a central and a far base station.',qa:[]},

{n:63,about:'المراجع (1/2): من [1] لـ [8].',
detail:['[1] LEACH، Heinzelman 2000. [2] HEED، Younis وFahmy 2004. [3] PEGASIS، Lindsey 2002. [4] SH-LEACH، Shrestha 2015. [5] H-LEACH، Razaque 2016. [6] EECH-HEED، Kaur 2025. [7] TLC-LEACH، Subedi 2024. [8] DL-HEED، Juwaied 2025.','الأهم تقريه: [1] و[2] عشان دول الأساس.'],say:'',qa:[]},

{n:64,about:'المراجع (2/2): من [9] لـ [15].',
detail:['[9] RL-ILEACH، El-Sayed 2026. [10] FTEC 2019 (Backup CH، أقرب حاجة لشغلك). [11] مراجعة تغيير الـ CH 2022. [12] EEUC 2005 (multi-hop). [13] EAUCA 2021. [14] Heinzelman 2002 (مصدر نموذج الراديو بميلين). [15] ns-3.41.','الأهم تقريه: [14] و[10] و[12].'],say:'',qa:[]},

{n:65,about:'سلايد الشكر والأسئلة.',detail:['بتشكري اللجنة وبتفتحي باب الأسئلة. اتأكدي إنك مراجعة "الأسئلة المتوقعة" اللي في آخر كل سلايد في الملف ده.'],say:'Thank you. I am happy to take your questions.',qa:[]},
];

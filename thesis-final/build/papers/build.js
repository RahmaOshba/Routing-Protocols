const fs=require('fs');process.chdir(__dirname+'/..');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,AlignmentType,HeadingLevel,BorderStyle,LevelFormat,Footer,PageNumber}=require('docx');
const RED='8A2522',CH='323232',CREAM='EDEDE5',PINK='F6E3E1',W=9638;
const FNT={ascii:'Arial',hAnsi:'Arial',cs:'Arial',eastAsia:'Arial'};
const t=(s,o={})=>new TextRun({text:s,font:o.mono?{ascii:'Consolas',hAnsi:'Consolas',cs:'Arial'}:FNT,size:o.size||22,sizeComplexScript:o.size||22,bold:o.b,boldComplexScript:o.b,italics:o.i,color:o.c||CH,rightToLeft:!o.ltr});
const P=(runs,o={})=>new Paragraph({bidirectional:!o.ltr,alignment:o.align||(o.ltr?AlignmentType.LEFT:AlignmentType.RIGHT),children:(typeof runs==='string'?[t(runs,o)]:runs),spacing:{after:o.after??100,before:o.before??0,line:o.line||300,lineRule:'auto'},keepNext:o.keepNext,pageBreakBefore:o.pb});
const H1=(s,pb)=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,heading:HeadingLevel.HEADING_1,pageBreakBefore:pb,children:[t(s,{size:32,b:true,c:RED})],spacing:{before:120,after:140},border:{bottom:{style:BorderStyle.SINGLE,size:8,color:RED,space:4}},keepNext:true});
const H2=s=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,heading:HeadingLevel.HEADING_2,children:[t(s,{size:26,b:true,c:RED})],spacing:{before:220,after:90},keepNext:true});
const H3=s=>P([t(s,{b:true,size:23})],{before:120,after:60,keepNext:true});
const B=s=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:(typeof s==='string'?[t(s)]:s),spacing:{after:70,line:290,lineRule:'auto'}});
const nb={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
function box(title,lines,fill=CREAM){return new Table({visuallyRightToLeft:true,width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:W,type:WidthType.DXA},
  borders:{top:nb,bottom:nb,left:nb,right:{style:BorderStyle.SINGLE,size:24,color:RED}},shading:{type:ShadingType.CLEAR,color:'auto',fill},margins:{top:110,bottom:110,left:200,right:200},
  children:[...(title?[P([t(title,{b:true,c:RED})],{after:60})]:[]),...lines.map(l=>typeof l==='string'?P([t(l,{size:21})],{after:60}):l)]})]})]});}
// equation block: LTR monospace lines in a grey box
function eq(lines){return new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:W,type:WidthType.DXA},
  borders:{top:nb,bottom:nb,right:nb,left:{style:BorderStyle.SINGLE,size:18,color:'888888'}},shading:{type:ShadingType.CLEAR,color:'auto',fill:'F4F4F0'},margins:{top:90,bottom:90,left:200,right:200},
  children:lines.map(l=>new Paragraph({alignment:AlignmentType.LEFT,spacing:{after:30,line:280,lineRule:'auto'},children:[t(l,{mono:true,ltr:true,size:21,b:true})]}))})]})]});}
const bd={style:BorderStyle.SINGLE,size:4,color:'D0CFC6'},borders={top:bd,bottom:bd,left:bd,right:bd};
function table(head,rows,widths,opt={}){const tot=widths.reduce((a,b)=>a+b,0);
  const mk=(v,j,i,hdr)=>new TableCell({width:{size:widths[j],type:WidthType.DXA},borders,shading:{type:ShadingType.CLEAR,color:'auto',fill:hdr?RED:(opt.hl&&opt.hl(i)?PINK:(i%2===0?CREAM:'FFFFFF'))},margins:{top:45,bottom:45,left:90,right:90},
    children:[new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,children:[t(String(v),{size:opt.size||19,b:hdr||(opt.hl&&opt.hl(i))||(j===0&&opt.bf),c:hdr?'FFFFFF':CH})]})]});
  return new Table({visuallyRightToLeft:true,width:{size:tot,type:WidthType.DXA},columnWidths:widths,rows:[new TableRow({tableHeader:true,children:head.map((h,j)=>mk(h,j,-1,true))}),...rows.map((r,i)=>new TableRow({cantSplit:true,children:r.map((v,j)=>mk(v,j,i,false))}))]});}
const sp=()=>P('',{after:60});
const sym=rows=>table(['الرمز','معناه'],rows,[2400,7238],{bf:true});
const say=lines=>box('🎤 السيناريو (تقوليه للجنة)',lines,'FFF7E6');
const c=[];

// ===== cover
c.push(P([t('مراجعة الأبحاث الأصلية والـ Hybrid',{b:true,size:46,c:RED})],{after:80}));
c.push(P([t('LEACH · HEED · PEGASIS · SH-LEACH · H-LEACH — السيناريو + المعادلات + الـ Parameters',{size:26,b:true})],{after:120}));
c.push(P([t('م. رحمة خالد عشبة',{b:true})],{after:260}));
c.push(box('إزاي تذاكري الملف ده',[
 'لكل بحث هتلاقي بالترتيب: (1) البطاقة: مين وإمتى، (2) السيناريو اللي تقوليه للجنة، (3) المعادلات وشرح كل رمز ومثال بالأرقام، (4) جدول الـ Parameters، (5) الميزات والعيوب، (6) أخدتي منه إيه وأرقام إعادة البناء بتاعتك، (7) أسئلة متوقعة.',
 'وفي الآخر: جدول مقارنة للـ Parameters بين التلاتة والبيئة الموحدة، وجملة الختام، وأسئلة سريعة.'],'FFF7E6'));

// ================= LEACH
c.push(H1('البحث الأول: LEACH (Low-Energy Adaptive Clustering Hierarchy)',true));
c.push(table(['البند','التفاصيل'],[['المؤلفين','W. R. Heinzelman, A. Chandrakasan, H. Balakrishnan — MIT'],['النشر','Proc. HICSS (Hawaii International Conference on System Sciences), 2000'],['الفكرة في سطر','clustering بقائد (CH) بيتغير بالقرعة كل round، والـ CH بيدمج الداتا ويبعت رسالة واحدة للـ BS'],['المحاكاة','MATLAB، 100 نود']],[2400,7238],{bf:true}));
c.push(sp());
c.push(say([
 '"أول بحث هو LEACH، وده الأساس لكل بروتوكولات الـ clustering.',
 'المشكلة اللي كان بيحلها: لو كل حساس بعت للـ BS مباشرة، الحساسات البعيدة هتموت بسرعة. ولو كل حساس عدّى داتته على جاره (MTE / multi-hop)، الحساسات القريبة من الـ BS هتموت الأول لأنها شايلة داتا الكل. والـ clustering الثابت بيموّت الـ CH بسرعة ومعاه الـ cluster كله.',
 'الفكرة: نقسم الشبكة لـ clusters، وكل cluster ليه Cluster Head. الأعضاء بيبعتوا للـ CH من مسافة قصيرة، والـ CH بيجمّع الداتا في رسالة واحدة ويبعتها للـ BS.',
 'وعشان الـ CH مايموتش لوحده، الدور بيلف على النودز: كل نود بتسحب رقم عشوائي، ولو أقل من threshold اسمه T(n) بتبقى CH. والمعادلة معمولة بحيث كل نود تاخد دورها مرة في كل epoch (20 round لما P = 5%). والـ CH بيعمل جدول TDMA، فالعضو بيصحى بس في ميعاده وبينام باقي الوقت.',
 'النتيجة: وفّر طاقة 7 لـ 8 مرات مقارنة بالمباشر، وأول نود بتموت متأخرة حوالي 8 مرات، وآخر نود حوالي 3 مرات.',
 'العيب: الاختيار بالقرعة من غير ما يبص على الطاقة، وعدد الـ CHs وأماكنهم عشوائي، ولو الـ CH مات مفيش حل.',
 'أنا أخدت منه الـ threshold T(r) والـ epoch، وإن العضو ينضم لأقرب CH، وضفت عليه الطاقة في الاختيار."']));
c.push(H2('المعادلات'));
c.push(H3('① طاقة الإرسال (First-order radio model)'));
c.push(eq(['E_Tx(k, d) = E_elec · k  +  ε_amp · k · d²']));
c.push(sym([['k','عدد البتات في الرسالة'],['d','المسافة بين المُرسل والمستقبل (متر)'],['E_elec · k','طاقة الدواير الإلكترونية، ثابتة مهما كانت المسافة'],['ε_amp · k · d²','طاقة المكبّر، بتكبر مع مربع المسافة']]));
c.push(box('مثال بالأرقام',['رسالة 2000 بت لمسافة 100 m:  الدواير = 50×10⁻⁹ × 2000 = 0.0001 J،  والمكبّر = 100×10⁻¹² × 2000 × 100² = 0.002 J،  والإجمالي ≈ 0.0021 J. يعني بطارية 0.5 J تكفّي حوالي 240 رسالة بس للمسافة دي.']));
c.push(H3('② طاقة الاستقبال'));
c.push(eq(['E_Rx(k) = E_elec · k']));
c.push(P('الاستقبال بيصرف الدواير بس، بس البحث بيقول إنه "مش رخيص"، فلازم نقلل عدد مرات الإرسال والاستقبال كمان، مش المسافة بس.'));
c.push(H3('③ الإرسال المباشر مقابل الـ MTE (شبكة على خط: n نودز، بين كل اتنين مسافة r)'));
c.push(eq(['E_direct = k · ( E_elec + ε_amp · n² · r² )','E_MTE    = k · ( (2n − 1) · E_elec + ε_amp · n · r² )']));
c.push(P('المباشر: إرسال واحد لمسافة كبيرة (n·r). الـ MTE: n إرسال قصير (r) + (n−1) استقبال.'));
c.push(H3('④ إمتى المباشر أحسن من الـ MTE'));
c.push(eq(['E_direct < E_MTE    ⟺    E_elec / ε_amp  >  r² · n / 2']));
c.push(box('مثال + الربط بشغلك',['E_elec / ε_amp = 50 nJ ÷ 100 pJ = 500 m². لو n = 10، المباشر أحسن طالما r² < 100، يعني r < 10 m.','👈 ده نفس منطق v8-Chain: التوصيل عن طريق حد تاني بيستاهل بس لما يبقى أرخص من المباشر (وبنحسب الاستقبال والدمج كمان).']));
c.push(H3('⑤ شرط اختيار المسار في الـ MTE القديم'));
c.push(eq(['A → B → C   if   d²_AB + d²_BC  <  d²_AC']));
c.push(P('بيحسب المكبّر بس ومش بيحسب تكلفة الاستقبال عند B، وده عيب الـ MTE القديم.'));
c.push(H3('⑥ معادلة اختيار الـ CH (أهم معادلة)'));
c.push(eq(['               P','T(n) = ─────────────────────────     if n ∈ G','        1 − P · ( r mod (1/P) )','','T(n) = 0                            otherwise','','node becomes CH  if  rand(0,1) < T(n)']));
c.push(sym([['P','نسبة الـ CHs المطلوبة (0.05 = 5%)'],['r','رقم الـ round الحالي'],['1/P','طول الـ epoch (20 round)'],['r mod (1/P)','إحنا في round رقم كام جوه الـ epoch (0 لـ 19)'],['G','النودز اللي ماكانتش CH في آخر 1/P round']]));
c.push(table(['r mod 20','الحساب','T(n)','المعنى'],[['0','0.05 ÷ (1 − 0)','0.05','فرصة 5%'],['10','0.05 ÷ (1 − 0.5)','0.10','الفرصة اتضاعفت'],['18','0.05 ÷ (1 − 0.9)','0.50','فرصة 50%'],['19','0.05 ÷ (1 − 0.95)','1.00','أكيد هتبقى CH']],[1600,3000,1600,3438]));
c.push(P('ليه بتكبر؟ اللي خدوا دورهم بيخرجوا من G، فالاحتمال بيكبر للي فاضلين عشان عدد الـ CHs يفضل حوالي 5%. وبعد 20 round الكل يرجع مؤهل.',{before:80}));
c.push(H2('الـ Parameters'));
c.push(table(['الـ Parameter','القيمة','ملاحظة'],[['E_elec','50 nJ/bit','للإرسال والاستقبال'],['ε_amp','100 pJ/bit/m²','d² بس (single-term)'],['حجم الرسالة k','2000 bit',''],['تكلفة الدمج','5 nJ/bit/message',''],['P','5%','الأمثل من Figure 8'],['عدد النودز','100',''],['الأرض','50 × 50 m','x من −25 لـ 25، y من 0 لـ 50'],['مكان الـ BS','(0, −100)','100 m من أقرب نود'],['الطاقة الأولية','0.25 / 0.5 / 1 J',''],['النتيجة عند 0.5 J','FND 932، LND 1312','Table 2'],['المقارنة عند 0.5 J','Direct 109/234، MTE 8/429، Static 80/110','FND / LND']],[2600,3200,3838],{bf:true}));
c.push(H2('الميزات والعيوب'));
c.push(table(['✅ الميزات','❌ العيوب'],[['موزّع بالكامل، ومش محتاج الـ BS ولا معرفة بالشبكة كلها','مش بيبص على الطاقة: T(n) مفيهاش طاقة (البحث قال future work)'],['مفيش مفاوضات، ورسايل التحكم قليلة','عدد الـ CHs مش مضمون: ممكن round كتير وround مفيهوش'],['الدوران بيوزّع الحمل، والنودز بتموت عشوائي','الـ CH ممكن يطلع على الطرف أو جنب CH تاني'],['الدمج بيقلل الداتا','كل CH بيبعت للـ BS مباشرة، وده غالي لو بعيد'],['TDMA بيخلي الأعضاء يناموا','مفيش حل لموت الـ CH، والمحاكاة ماحسبتش تكلفة الـ setup']],[4819,4819]));
c.push(H2('علاقته بشغلك'));
c.push(table(['في LEACH','عندك'],[['T(n) والـ epoch','v3: P(CH) = min(1, T(r) × score)'],['الانضمام لأقرب CH','موجود في كل نسخك'],['مفيش طاقة في القرار','الـ score (الطاقة × الجيران) وشرط I5'],['الـ epoch ممكن يخلص ومحدش مؤهل','I1: epoch جديد'],['مفيش حل لموت الـ CH','Backup + إصلاح + I2'],['كل CH للـ BS مباشرة','v8-Chain: relay بس لو أرخص'],['re-clustering كل round','إعادة استخدام كل 5 rounds']],[4819,4819]));
c.push(box('أرقام إعادة البناء بتاعتك',['paper-exact: LND 1321 (البحث 1312)، وFND 882 (البحث 932).','البيئة الموحدة: FND 1409، وHND 1626، وLND 1962، وPDR 98.37%.'],PINK));
c.push(H2('أسئلة متوقعة'));
[['إيه الـ epoch، وليه T(n) بتكبر؟','الـ epoch = 1/P round. اللي بقوا CH بيخرجوا من G، فالاحتمال بيكبر للي فاضلين، لحد ما آخر نود تاخد دورها (T = 1).'],['ليه 5%؟','البحث جرّب نسب مختلفة (Figure 8) ولقى 5% أقل طاقة لإعداداته: أقل من كده الأعضاء بيبعتوا لبعيد، وأكتر يبقى رسايل كتير للـ BS.'],['هل LEACH بيهتم بالطاقة؟','لأ، في المعادلة الأساسية لأ. بيفترض إن الكل بيبدأ بنفس الطاقة وإن الدوران بيساوي الاستهلاك.']].forEach(([q,a])=>{c.push(P([t('س: ',{b:true,c:RED}),t(q,{b:true})],{after:30,keepNext:true}));c.push(P([t('ج: ',{b:true,c:RED}),t(a)],{after:120}));});

// ================= HEED
c.push(H1('البحث التاني: HEED (Hybrid, Energy-Efficient, Distributed)',true));
c.push(table(['البند','التفاصيل'],[['المؤلفين','O. Younis, S. Fahmy — Purdue University'],['النشر','IEEE Transactions on Mobile Computing, vol. 3, no. 4, 2004'],['الفكرة في سطر','اختيار الـ CH بمعيارين: الطاقة المتبقية (أساسي) وتكلفة الاتصال (ثانوي)، بمفاوضات بيتضاعف فيها الاحتمال'],['Hybrid معناها','معيارين مع بعض، مش دمج بروتوكولين']],[2400,7238],{bf:true}));
c.push(sp());
c.push(say([
 '"البحث التاني HEED، وجه عشان يصلّح عيب LEACH إنه مش بيبص على الطاقة، وإن الـ CHs بتطلع عشوائي.',
 'الفكرة: اختيار الـ CH بيعتمد على معيارين، وده معنى Hybrid. الأساسي هو الطاقة المتبقية: احتمال إن النود تبقى CH = نسبة ابتدائية × (الطاقة المتبقية ÷ الطاقة الكاملة). والثانوي هو تكلفة الاتصال، زي عدد الجيران، وبيتستخدم لو النود سمعت أكتر من CH تختار مين.',
 'إزاي بيشتغل: النودز بتتفاوض على كذا iteration، وكل مرة الاحتمال بيتضاعف لحد ما يوصل 1. النود القوية بتوصل لـ 1 الأول وتعلن نفسها CH، والضعيفة بتنضم ليها. فالـ CHs بتطلع بطاقة عالية وموزّعة كويس، واحتمال إن اتنين جيران يبقوا CH حوالي 0.006 بس. وعدد الخطوات ثابت O(1)، والرسايل O(1) لكل نود.',
 'النتيجة: كسب gen-LEACH في الـ FND والـ LND، وصرف طاقة أقل في الـ clustering.',
 'العيب: المفاوضات بتتكرر مع كل clustering، فرسايل التحكم بتاكل الطاقة. والبحث نفسه اعترف إن LEACH الأصلي بيكسبه في سيناريو LEACH.',
 'ونقطة مهمة: في جزء Fault Tolerance قالوا إن الحل لموت الـ CH هو backup cluster heads، وسابوه future work.',
 'أنا أخدت منه الطاقة وعدد الجيران في معادلة الاختيار، بس من غير مفاوضات، بحسبة واحدة، ونفّذت فكرة الـ Backup اللي هو اقترحها."']));
c.push(H2('المعادلات'));
c.push(H3('① احتمال إن النود تبقى CH'));
c.push(eq(['CH_prob = max( C_prob × ( E_residual / E_max ) ,  p_min )']));
c.push(sym([['C_prob','النسبة الأولية للـ CHs (5%)، بتحدد عدد الإعلانات في الأول بس'],['E_residual','الطاقة المتبقية في النود دلوقتي'],['E_max','الطاقة الكاملة (بطارية مليانة)'],['E_residual / E_max','نسبة البطارية (0 لـ 1)'],['p_min','أقل احتمال مسموح بيه (10⁻⁴ أو 0.0005)، عشان النود الضعيفة ماتفضلش صفر والعملية تخلص في عدد خطوات محدود']]));
c.push(box('مثال',['نود بطاريتها 60%: CH_prob = 0.05 × 0.6 = 0.03']));
c.push(H3('② مضاعفة الاحتمال في كل iteration'));
c.push(eq(['CH_prob = min( CH_prob × 2 ,  1 )']));
c.push(table(['النود','البطارية','البداية','التسلسل','عدد الـ iterations'],[['A','100%','0.05','0.05 → 0.1 → 0.2 → 0.4 → 0.8 → 1','6'],['B','60%','0.03','0.03 → 0.06 → 0.12 → 0.24 → 0.48 → 0.96 → 1','7'],['C','20%','0.01','0.01 → … → 0.64 → 1','8'],['D','شبه فاضية','p_min = 10⁻⁴','…','حوالي 15']],[800,1200,1500,4538,1600]));
c.push(P('القوية بتوصل لـ 1 الأول، فبتعلن نفسها final CH، والضعيفة لسه في النص فبتنضم ليها. ده السر إن الـ CHs بتطلع بطاقة عالية.',{before:80}));
c.push(H3('③ أقصى عدد iterations (Lemma 1)'));
c.push(eq(['N_iter  ≤  ⌈ log₂( 1 / p_min ) ⌉ + 1','','p_min = 10⁻⁴   →  ⌈13.3⌉ + 1 = 15','p_min = 0.0005 →  12   (value used in the paper)']));
c.push(H3('④ متوسط أقل قوة للوصول للـ CH (AMRP)'));
c.push(eq(['AMRP = ( Σ MinPwr_i ) / M        i = 1 … M']));
c.push(sym([['MinPwr_i','أقل قوة إرسال محتاجها النود i عشان توصل للـ CH المرشح'],['M','عدد النودز جوه مدى الـ cluster'],['المعنى','تقدير لطاقة الـ cluster لو النود دي بقت CH، وكل ما يقل كل ما يبقى أحسن']]));
c.push(table(['نوع التكلفة (الثانوي)','إمتى','النود بتنضم لـ'],[['Min degree','توزيع الحمل','الـ CH اللي جيرانه أقل'],['Max degree','clusters كثيفة','الـ CH اللي جيرانه أكتر'],['AMRP','قوة الإرسال متغيرة','الـ CH اللي AMRP بتاعه أقل']],[2800,3000,3838]));
c.push(H3('⑤ احتمال إن اتنين جيران يبقوا الاتنين CH (Lemma 5)'));
c.push(eq(['p_nbr = Π_{i=0}^{⌈log₂(1/p)⌉−1} ( 1 − p · 2^i )²','','p = 5%  →  p_nbr ≈ 0.006','p = 3%  →  p_nbr ≈ 0.00016']));
c.push(H3('⑥ شرط اتصال الـ CHs ببعض (Lemma 8)'));
c.push(eq(['R_t  ≥  6 × R_c']));
c.push(sym([['R_c','مدى الـ cluster (بين الأعضاء والـ CH)'],['R_t','مدى الاتصال بين الـ CHs (multi-hop للـ BS)']]));
c.push(H3('⑦ نموذج الراديو (two-slope)'));
c.push(eq(['E_Tx = n_b · ( E_elec + E_amp · dⁿ )','   n = 2 ,  E_amp = ε_fs     if d < d0    (free space)','   n = 4 ,  E_amp = ε_mp     if d ≥ d0    (multipath)','E_Rx = n_b · E_elec','','d0 = √( ε_fs / ε_mp ) = √( 10 / 0.0013 ) ≈ 87.7 m   (paper uses 75 m)']));
c.push(H3('⑧ gen-LEACH اللي قارن بيه'));
c.push(eq(['CH_prob(t) = min( ( E_i(t) / E_total(t) ) × k ,  1 )']));
c.push(P('LEACH متعدّل بيستخدم الطاقة، بس محتاج يعرف طاقة الشبكة كلها (E_total)، وده رسايل كتير. k_opt = 11.'));
c.push(H2('الـ Parameters (Table 2 في البحث)'));
c.push(table(['الـ Parameter','القيمة','ملاحظة'],[['الأرض','100 × 100 m',''],['مكان الـ Sink','(50, 175)','برا الأرض ولفوق'],['الطاقة الأولية','2 J',''],['مدى الـ cluster R_c','25 m',''],['رسالة الداتا','100 bytes',''],['رسالة الإعلان','25 bytes',''],['الـ Header','25 bytes',''],['الـ Round (T_NO)','5 TDM frames','الـ clustering مش كل frame'],['E_elec','50 nJ/bit',''],['ε_fs','10 pJ/bit/m²','لـ d²'],['ε_mp','0.0013 pJ/bit/m⁴','لـ d⁴'],['E_fusion','5 nJ/bit/signal',''],['d0','75 m','المحسوب من الثوابت 87.7 m'],['C_prob','5%',''],['p_min','0.0005','أقصى 12 iteration'],['النود ميتة','لما تخسر 99.9% من طاقتها',''],['تجارب جودة الـ clustering','1000 نود في 2000 × 2000 m، ونطاق من 25 لـ 400 m','متوسط 100 تجربة']],[2600,3200,3838],{bf:true}));
c.push(H2('الميزات والعيوب'));
c.push(table(['✅ الميزات','❌ العيوب'],[['بيهتم بالطاقة، فالـ CHs قوية','المفاوضات بتتكرر كل clustering (6 لـ 15 iteration)'],['CHs موزّعة كويس (p_nbr ≈ 0.006)','لو الـ clustering كل round، الـ overhead كبير (وده اللي حصل عندك)'],['عدد خطوات ثابت O(1) ورسايل O(n)','محتاج كذا مستوى لقوة الإرسال'],['من غير GPS ولا معرفة بالشبكة كلها','مابيحلّش موت الـ CH المفاجئ (future work)'],['كل نود مضمون تبقى في cluster','في سيناريو LEACH بالظبط، LEACH الأصلي أحسن منه (باعترافهم)'],['Multi-hop بين الـ CHs','']],[4819,4819]));
c.push(H2('علاقته بشغلك'));
c.push(table(['في HEED','عندك'],[['CH_prob ∝ E_residual / E_max','الجزء (E / E0) في الـ score'],['الـ degree معيار ثانوي لفض التعادل','(1 + degree / maxDegree)، بس داخل في الاحتمال نفسه'],['مفاوضات كذا iteration','v3: حساب واحد (single-pass)'],['T_NO ≫ T_CP (والـ round 5 frames)','إعادة استخدام الـ clusters 5 rounds'],['"maintain backup cluster heads" (future work)','v5: Backup + إصلاح، وv8: I2'],['Multi-hop بين الـ CHs','v6/v7/v7.1، وv8-Chain (بس لو أرخص)'],['مضاعفة الاحتمال','SH-LEACH أخدها، وإنتي لقيتي إنها بتتعمل مرة واحدة بس فيه وصلّحتيها']],[4819,4819]));
c.push(box('أرقام إعادة البناء بتاعتك',['paper-exact (2 J، والـ Sink عند (50,175)): FND 1106، وHND 1626، وLND 1996، وPDR 99.97% (البحث: رسومات بس).','البيئة الموحدة (0.5 J، والـ BS في النص): FND 323، وHND 570، وLND 1362، وPDR 99.69%.','ليه وقع؟ الطاقة ربعها، والمفاوضات بتتكرر كل round، فرسايل التحكم أكلت البطارية. وده اللي خلاكي في v3 تشيلي المفاوضات وتعيدي استخدام الـ clusters.'],PINK));
c.push(H2('أسئلة متوقعة'));
[['إيه الفرق الأساسي بين LEACH وHEED؟','LEACH بالقرعة ومن غير طاقة وفي خطوة واحدة. HEED باحتمال متناسب مع الطاقة، وبيكرر مع مضاعفة الاحتمال، وبيفض التعادل بتكلفة الاتصال. فالـ CHs أقوى وموزّعة أحسن، بس فيه رسايل أكتر.'],['ليه HEED بيضاعف الاحتمال؟','عشان يخلص في عدد خطوات ثابت (log₂(1/p_min) + 1)، وعشان القوية توصل لـ 1 الأول وتعلن نفسها، والضعيفة تنضم ليها.'],['ليه HEED عندك بيموت بدري مع إن الـ PDR عالي؟','الـ PDR عالي لأن الـ CHs قوية وموزّعة كويس. بس المفاوضات كل round بتصرف طاقة من كل النودز، فأول نود بتموت عند 323.'],['أخدتي إيه من HEED وغيرتي إيه؟','أخدت الطاقة وعدد الجيران. وغيرت إنهم بقوا في معادلة واحدة بتتحسب مرة واحدة من غير مفاوضات، ومعاها إعادة استخدام كل 5 rounds، وضفت الـ Backup اللي HEED نفسه اقترحه.']].forEach(([q,a])=>{c.push(P([t('س: ',{b:true,c:RED}),t(q,{b:true})],{after:30,keepNext:true}));c.push(P([t('ج: ',{b:true,c:RED}),t(a)],{after:120}));});

// ================= PEGASIS
c.push(H1('البحث التالت: PEGASIS (Power-Efficient GAthering in Sensor Information Systems)',true));
c.push(table(['البند','التفاصيل'],[['المؤلفين','S. Lindsey, C. S. Raghavendra — The Aerospace Corporation'],['النشر','Proc. IEEE Aerospace Conference, 2002'],['الفكرة في سطر','سلسلة واحدة (chain) من كل النودز، وكل round قائد واحد بس بيبعت للـ BS'],['المحاكاة','C، 100 نود']],[2400,7238],{bf:true}));
c.push(sp());
c.push(say([
 '"البحث التالت PEGASIS، وجه بعد LEACH وقال لسه فيه طاقة ممكن نوفّرها: LEACH بيكوّن clusters كل round بإعلانات بقوة عالية، وكذا CH بيبعتوا للـ BS البعيد، والـ CH بيستقبل حوالي 20 رسالة.',
 'الفكرة: بدل clusters، نعمل سلسلة واحدة (chain) بتعدّي على كل النودز. بتتبني بطريقة greedy: نبدأ بأبعد نود عن الـ BS، وكل مرة نوصّل بأقرب نود لسه مادخلتش. ولما نود تموت، السلسلة بتتبني من جديد.',
 'إزاي بيشتغل: كل round فيه قائد واحد بالدور (i mod N). القائد بيبعت token للطرفين، والداتا بتمشي من طرفين السلسلة ناحيته، وكل نود بتدمج اللي جايلها مع داتتها. وفي الآخر القائد بس بيبعت رسالة واحدة للـ BS. يعني كل نود بتبعت وتستقبل رسالة واحدة بس، لأقرب جار.',
 'النتيجة: أحسن من LEACH مرتين في أرض 50×50، و3 مرات في 100×100، وقريب من الحد الأقصى النظري (حوالي 800 من 1100 round ممكنة).',
 'العيوب: تأخير كبير لأن الداتا بتعدّي على نودز كتير، وsingle point of failure (لو نود ماتت السلسلة تتبني من جديد)، ومحتاج يعرف أماكن كل النودز، والقائد بالدور من غير طاقة.',
 'أنا أخدت منه فكرة السلسلة، وطبقتها على الـ CHs بس في v6 وv7، وفي الآخر في v8-Chain بقى الـ CH يوصّل عن طريق CH تاني بس لما ده يوفّر طاقة."']));
c.push(H2('المعادلات'));
c.push(H3('① نفس نموذج راديو LEACH'));
c.push(eq(['E_Tx(k, d) = E_elec · k  +  ε_amp · k · d²','E_Rx(k)    = E_elec · k']));
c.push(H3('② المسافة اللي عندها الإرسال بيبقى ضعف الاستقبال'));
c.push(eq(['ε_amp · d² = E_elec   ⟹   d² = 50 nJ / 100 pJ = 500   ⟹   d ≈ 22.4 m']));
c.push(P('أقل من 22 m، المكبّر أرخص من الدواير، فتقليل عدد مرات الإرسال والاستقبال أهم من تقليل المسافة. والبحث قال: في نموذج d⁴ هيوفّر أكتر كمان (وده بيفسّر ليه PEGASIS عندك عمره طويل في الـ two-slope).'));
c.push(H3('③ اختيار القائد'));
c.push(eq(['Leader( round i ) = node ( i mod N )','','N = 100 ,  round 205  →  node 5']));
c.push(P('كل نود بتبقى قائد مرة كل 100 round، ومكانه في السلسلة عشوائي، فالنودز بتموت في أماكن عشوائية. وكمان النودز اللي جارها بعيد (فوق threshold) مابتبقاش قائد.'));
c.push(H3('④ الحد الأقصى النظري للعمر (0.25 J، 100 نود)'));
c.push(eq(['per round     : Tx + Rx electronics = 2 × 50 nJ × 2000 = 0.0002 J','per 100 rounds: 100 × 0.0002 + 0.002 (one Tx to BS) ≈ 0.022 J','max lifetime  ≈ 0.25 / 0.022 × 100 ≈ 1100 rounds','PEGASIS       ≈ 800 rounds  →  near optimal']));
c.push(H3('⑤ بناء السلسلة (Greedy)'));
c.push(eq(['1) start from the node FARTHEST from the BS','2) link to the NEAREST node not yet in the chain','3) repeat until all nodes are in   (a node dies → rebuild)']));
c.push(H3('⑥ جمع الداتا (Token passing)'));
c.push(eq(['c0 → c1 → c2 ← c3 ← c4','           ↓','           BS','','each node : 1 Rx + fuse + 1 Tx','leader    : 2 Rx + fuse + 1 Tx to BS']));
c.push(H2('الـ Parameters'));
c.push(table(['الـ Parameter','القيمة','ملاحظة'],[['E_elec','50 nJ/bit','زي LEACH'],['ε_amp','100 pJ/bit/m²','d² بس'],['حجم الرسالة k','2000 bit',''],['تكلفة الدمج','5 nJ/bit/message',''],['عدد النودز','100',''],['الأرض الأولى','50 × 50 m، والـ BS عند (25, 150)','100 m على الأقل'],['الأرض التانية','100 × 100 m، والـ BS عند (50, 300)',''],['الطاقة الأولية','0.25 / 0.5 / 1 J',''],['القائد','i mod N + threshold على مسافة الجار',''],['النتيجة (0.5 J، 50×50)','1%: 1578، 20%: 2011، 50%: 2082، 100%: 2192','Table 1'],['LEACH في نفس الجدول','803 / 962 / 1036 / 1208','أرقام غير بحث LEACH لأن مكان الـ BS مختلف']],[2600,3600,3438],{bf:true}));
c.push(H2('LEACH مقابل PEGASIS'));
c.push(table(['','LEACH','PEGASIS'],[['مسافة إرسال النود العادية','لحد الـ CH','لأقرب جار (قصيرة جدًا)'],['القائد بيستقبل كام رسالة','حوالي 20','2 بالكتير'],['كام نود بتبعت للـ BS في الـ round','حوالي 5','1'],['تكوين clusters كل round','آه','لأ']],[3400,3100,3138],{bf:true}));
c.push(H2('الميزات والعيوب'));
c.push(table(['✅ الميزات','❌ العيوب'],[['مسافات قصيرة جدًا، فأقل طاقة','تأخير كبير: الداتا بتعدّي على حوالي 100 نود'],['نود واحدة بس للـ BS كل round','Single point of failure: السلسلة بتقف لحد ما تتبني'],['مفيش overhead clusters كل round','محتاج أماكن كل النودز (global knowledge)'],['كل نود رسالة واحدة بس','القائد بالدور من غير طاقة'],['قريب من الأمثل','النودز اللي جارها بعيد بتموت بدري، فالـ FND بدري'],['','القائد بيبعت للـ BS مباشرة مهما كان بعيد']],[4819,4819]));
c.push(H2('علاقته بشغلك'));
c.push(table(['في PEGASIS','عندك'],[['سلسلة من كل النودز','v6/v7: سلسلة من الـ CHs بس، والأقرب للـ BS gateway'],['السلسلة بتتبني من جديد لما حد يموت','v7: النائب بياخد مكان الـ CH الميت في السلسلة'],['الإرسال للجار دايمًا','v8-Chain: relay بس لما يبقى أرخص'],['القائد بالدور من غير طاقة','اختيار بالطاقة (I5 + score) وتسليم قبل الموت (I2)'],['threshold على الطاقة (future work)','اختبار الطاقة النسبي (5% من المتوسط الحالي)']],[4819,4819]));
c.push(box('أرقام إعادة البناء بتاعتك',['paper-exact (0.5 J، 50×50، والـ BS عند (25,150)): FND 1614 (البحث 1578، فرق 2.3%)، وHND 2036 (2082)، وLND 2167 (2192، فرق حوالي 1%)، وPDR 97.75%.','البيئة الموحدة: FND 1324، وHND 2353، وLND 2887 (أعلى LND)، وPDR 98.67%.','LND طويل بسبب المسافات القصيرة ورسالة واحدة للـ BS، بس FND = 1324 بدري (v8-Chain: 2621).'],PINK));
c.push(H2('أسئلة متوقعة'));
[['PEGASIS عنده LND أحسن منك (2887 مقابل 2756)، ليه بروتوكولك أحسن؟','لأن الـ FND عندي 2621 مقابل 1324، يعني أول نود عنده بتموت قبلي بحوالي 1300 round، ومن ساعتها أجزاء من الأرض مش متراقبة. وفيه تأخير كبير وsingle point of failure، والـ PDR عندي أعلى (99.27% مقابل 98.67%).'],['ليه السلسلة بتبدأ من أبعد نود؟','الـ greedy بياخد الأقرب الأول فالمسافات بتكبر مع الوقت. لو بدأنا بالأبعد عن الـ BS، النودز البعيدة تاخد جيران قريبين.'],['إيه الفرق بين سلسلة PEGASIS وv7 وv8-Chain؟','PEGASIS: سلسلة ثابتة من كل النودز. v7: سلسلة من الـ CHs شغالة دايمًا. v8-Chain: كل CH بيقرر كل round هل التوصيل أرخص؛ في النص مفيش سلسلة، والـ BS بعيد تتكوّن لوحدها.'],['إيه الـ token passing؟','القائد بيبعت رسالة تحكم صغيرة لأول نود في كل طرف عشان تبدأ، فالداتا بتمشي من الطرفين ناحية القائد، وكل نود بتدمج.']].forEach(([q,a])=>{c.push(P([t('س: ',{b:true,c:RED}),t(q,{b:true})],{after:30,keepNext:true}));c.push(P([t('ج: ',{b:true,c:RED}),t(a)],{after:120}));});

eval(fs.readFileSync('papers/hybrid.js','utf8'));
// ================= comparison
c.push(H1('مقارنة الخمسة مع بعض',true));
c.push(H2('الأفكار'));
c.push(table(['','LEACH (2000)','HEED (2004)','PEGASIS (2002)'],[['الشكل','Clusters','Clusters','سلسلة واحدة'],['اختيار القائد','قرعة T(n)','احتمال ∝ الطاقة + مفاوضات','بالدور i mod N'],['بيبص على الطاقة؟','❌','✅','❌'],['overhead','قليل','عالي (iterations)','قليل جدًا'],['للـ BS','كل CH مباشرة','multi-hop بين الـ CHs','القائد بس مباشرة'],['العيب الأساسي','CH ضعيف أو في مكان وحش','الرسايل بتاكل الطاقة','تأخير + نقطة فشل واحدة'],['أخدتي منه','T(r) والـ epoch والانضمام لأقرب CH','الطاقة والجيران في الـ score، وفكرة الـ Backup','السلسلة، وبعدين relay بالطاقة']],[1900,2500,2600,2638],{bf:true,size:18}));
c.push(H2('الـ Parameters'));
c.push(table(['','LEACH','HEED','PEGASIS','البيئة الموحدة بتاعتك'],[['الأرض','50×50','100×100','50×50 / 100×100','100×100'],['مكان الـ BS','(0, −100)','(50, 175)','(25, 150) / (50, 300)','(50, 50) و(50, −100)'],['الطاقة','0.5 J','2 J','0.5 J','0.5 J'],['نموذج الراديو','d² بس','d² + d⁴','d² بس','d² + d⁴'],['E_elec','50 nJ','50 nJ','50 nJ','50 nJ'],['المكبّر','100 pJ/m²','10 pJ/m² و0.0013 pJ/m⁴','100 pJ/m²','10 pJ/m² و0.0013 pJ/m⁴'],['d0','—','75 m','—','87.7 m'],['الرسالة','2000 bit','100 byte','2000 bit','2000 bit (تحكم 200)'],['الدمج','5 nJ/bit','5 nJ/bit','5 nJ/bit','5 nJ/bit'],['نسبة الـ CHs','P = 5%','C_prob = 5%','قائد واحد','—']],[1500,1700,2100,2100,2238],{bf:true,size:17}));
c.push(P('👈 ده أحسن رد على "ليه أرقامك غير الأبحاث؟": كل بحث استخدم أرض ومكان BS وطاقة ونموذج راديو مختلف، فعملتي بيئة واحدة للكل.',{before:100,b:true}));
c.push(H2('الـ Hybrids مقابل الأصليين'));
c.push(table(['','LEACH','HEED','SH-LEACH','H-LEACH'],[['أساسه','—','—','LEACH','LEACH'],['أخد من HEED','—','—','C_prob × E/E_max','P × E/E_max'],['الإضافة','T(n) + G','مضاعفة متكررة','× r ÷ (1 + CH_cho mod 1/C)','شرط E > E_avg'],['العيب الأكبر','مش بيبص على الطاقة','overhead','عدد الـ CHs مش مضمون + مفيش مضاعفة','Deadlock + طاقة ثابتة'],['النتيجة المنشورة','FND 932 / LND 1312','رسومات','رسم بس','LND 4312'],['Improved عندك','—','—','PDR 99.79%','FND 2347'],['اتنقل لـ v8','T(r) والـ epoch','الطاقة والجيران','—','I5 (≥ المتوسط)']],[1700,1800,1800,2238,2100],{bf:true,size:17}));
c.push(H2('الأرقام: البحث مقابل إعادة البناء'));
c.push(table(['البروتوكول','البحث (LND)','paper-exact عندك','البيئة الموحدة (FND / HND / LND / PDR)'],[['LEACH','1312','1321','1409 / 1626 / 1962 / 98.37%'],['HEED','رسومات بس','1996','323 / 570 / 1362 / 99.69%'],['PEGASIS','2192','2167','1324 / 2353 / 2887 / 98.67%'],['SH-LEACH (improved)','رسم بس','884','1247 / 1600 / 1649 / 99.79%'],['H-LEACH (improved)','4312','1210','2347 / 2449 / 2499 / 97.33%'],['v8-Chain (للمقارنة)','—','—','2621 / 2711 / 2756 / 99.27%']],[2200,1800,2000,3638],{hl:i=>i===5}));
c.push(H2('🔗 جملة الختام'));
c.push(say(['"يعني كل بحث حل جزء: LEACH عمل الـ clustering والدوران بس من غير طاقة، وHEED زود الطاقة بس بمفاوضات مكلّفة، وPEGASIS قلل المسافات بالسلسلة بس بتأخير ونقطة فشل واحدة.','والبحثين الـ Hybrid (SH-LEACH وH-LEACH) حاولوا يدمجوا LEACH وHEED وحسّنوا الاختيار، بس فيهم أخطاء صلّحتها، وحتى بعد التصليح محدش فيهم بيعيد استخدام الـ clusters ولا بيتعامل مع موت الـ CH ولا بيوصّل بين الـ clusters.','وأنا جمعت الأحسن من الكل: دوران LEACH، وذكاء HEED بحسبة واحدة من غير مفاوضات، وشرط الطاقة من H-LEACH بعد تصليحه، والتوصيل من PEGASIS بس لما يوفّر طاقة. وزودت حاجة محدش فيهم عملها: حماية الـ CH قبل ما يموت وبعده."']));
c.push(H2('⚡ أسئلة سريعة'));
c.push(table(['السؤال','الرد في جملة'],[['غلطة SH-LEACH؟','الاحتمال بيبدأ صفر وبيكبر لحد ما يعدّي 1، فعدد الـ CHs مش مضمون، ومفيش مضاعفة متكررة.'],['غلطة H-LEACH؟','شرط أكبر من المتوسط بيوقّف البروتوكول في أول round (deadlock).'],['الفرق بين LEACH وHEED؟','LEACH بالقرعة ومن غير طاقة، وHEED بالطاقة بس بمفاوضات.'],['ليه PEGASIS مش الأحسن رغم LND أعلى؟','أول نود عنده بتموت قبلي بحوالي 1300 round، وفيه تأخير ونقطة فشل واحدة.'],['ليه HEED عندك بيموت بدري؟','المفاوضات كل round بطاقة 0.5 J بس، فالرسايل بتاكل البطارية.'],['إزاي تأكدتي إن الكود صح؟','بإعدادات كل بحث: LEACH 1321 (البحث 1312)، وPEGASIS 2167 (البحث 2192).'],['ليه d0 = 87.7 مش 75؟','87.7 محسوبة من √(ε_fs/ε_mp) بنفس ثوابت HEED، و75 قيمة ثابتة حطها البحث.']],[3600,6038],{bf:true}));

const doc=new Document({creator:'Rahma Khaled Oshba',title:'مراجعة LEACH وHEED وPEGASIS',
 styles:{default:{document:{run:{font:FNT,size:22,rightToLeft:true}}},paragraphStyles:[
  {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FNT,size:32,bold:true,color:RED},paragraph:{outlineLevel:0}},
  {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FNT,size:26,bold:true,color:RED},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'bul',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.RIGHT,style:{paragraph:{indent:{right:360,hanging:260}}}}]}]},
 sections:[{properties:{bidi:true,page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
  footers:{default:new Footer({children:[new Paragraph({bidirectional:true,alignment:AlignmentType.LEFT,children:[new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:RED,bold:true}),t('   مراجعة الأبحاث الأصلية والـ Hybrid',{size:16,c:'888888'})]})]})},
  children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('Original_Papers_Review_AR.docx',b);console.log('ok',b.length)});

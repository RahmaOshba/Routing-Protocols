const fs=require('fs');process.chdir(__dirname+'/..');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,AlignmentType,HeadingLevel,ImageRun,BorderStyle,LevelFormat,Footer,PageNumber,PageBreak,TableOfContents}=require('docx');
const RED='8A2522',CH='323232',CREAM='EDEDE5',W=9638;
const FNT={ascii:'Arial',hAnsi:'Arial',cs:'Arial',eastAsia:'Arial'};
const t=(s,o={})=>new TextRun({text:s,font:FNT,size:o.size||23,sizeComplexScript:o.size||23,bold:o.b,boldComplexScript:o.b,italics:o.i,italicsComplexScript:o.i,color:o.c||CH,rightToLeft:!o.ltr});
const P=(runs,o={})=>new Paragraph({bidirectional:!o.ltr,alignment:o.align||(o.ltr?AlignmentType.LEFT:AlignmentType.RIGHT),children:(typeof runs==='string'?[t(runs,o)]:runs),spacing:{after:o.after??120,before:o.before??0,line:o.line||310,lineRule:'auto'},keepNext:o.keepNext,pageBreakBefore:o.pb});
const H1=(s,pb)=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,heading:HeadingLevel.HEADING_1,pageBreakBefore:pb,children:[t(s,{size:30,b:true,c:RED})],spacing:{before:120,after:120},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:RED,space:4}},keepNext:true});
const H2=s=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,children:[t(s,{size:25,b:true,c:RED})],spacing:{before:160,after:80},keepNext:true});
const B=s=>new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t(s)],spacing:{after:90,line:310,lineRule:'auto'}});
function box(title,lines,fill=CREAM,ltr=false){return new Table({visuallyRightToLeft:true,width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({cantSplit:true,children:[new TableCell({width:{size:W,type:WidthType.DXA},
  borders:{top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},left:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},right:{style:BorderStyle.SINGLE,size:24,color:RED}},
  shading:{type:ShadingType.CLEAR,color:'auto',fill},margins:{top:110,bottom:110,left:200,right:200},
  children:[P([t(title,{b:true,c:RED,size:22})],{after:60}),...lines.map(l=>typeof l==='string'?P([t(l,{size:22,ltr})],{after:60,ltr}):l)]})]})]});}
function thumb(n){const f=`thumbs/s-${String(n).padStart(2,'0')}.jpg`;const buf=fs.readFileSync(f);
  // read JPEG size from SOF marker
  let i=2,w=0,h=0;while(i<buf.length){if(buf[i]!==0xFF){i++;continue;}const m=buf[i+1];const len=buf.readUInt16BE(i+2);if(m>=0xC0&&m<=0xC3){h=buf.readUInt16BE(i+5);w=buf.readUInt16BE(i+7);break;}i+=2+len;}
  const wi=4.6*96;return new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{before:60,after:100},children:[new ImageRun({type:'jpg',data:buf,transformation:{width:wi,height:wi*h/w},altText:{title:'Slide '+n,description:'Slide '+n,name:'slide'+n}})]});}
const S=[...require('./p1.js'),...require('./p2.js'),...require('./p3.js')];
const dump=fs.readFileSync('slides_dump.txt','utf8').split('=== SLIDE ').slice(1);
const titleOf=n=>{const lines=dump[n-1].split('\n').slice(1).filter(Boolean);return n===1?'العنوان':lines[0].match(/^\d\d$/)?lines[0]+' '+lines[1]:lines[0];};
if(S.length!==65) throw new Error('count '+S.length);
const c=[];
c.push(P([t('شرح الباور بوينت سلايد سلايد',{b:true,size:44,c:RED})],{after:120}));
c.push(P([t('Thesis Defense — v8-Chain · Energy-Efficient Secure Clustering in WSNs',{size:22,i:true,c:'555555',ltr:true})],{ltr:true,after:200}));
c.push(P([t('م. رحمة خالد عشبة',{b:true})],{after:300}));
c.push(box('إزاي تستخدمي الملف ده',[
 'الملف ماشي مع ملف Thesis_Defense_v8-Chain.pptx (النسخة الإنجليزي، 65 سلايد). لكل سلايد هتلاقي:',
 new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t('صورة صغيرة للسلايد عشان تعرفيها.',{size:22})]}),
 new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t('«السلايد بتتكلم عن إيه»: الفكرة في سطر.',{size:22})]}),
 new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t('«الشرح بالتفصيل»: كل رقم وكل فكرة معناها إيه وجت منين.',{size:22})]}),
 new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t('«تقوليها إزاي»: جملة بالإنجليزي ممكن تقوليها وإنتي بتعرضي.',{size:22})]}),
 new Paragraph({bidirectional:true,alignment:AlignmentType.RIGHT,numbering:{reference:'bul',level:0},children:[t('«أسئلة متوقعة»: أسئلة ممكن اللجنة تسألها وإجابتها (في السلايدات المهمة).',{size:22})]}),
],'FFF7E6'));
c.push(H2('أقسام العرض'));
[['1','العنوان وجدول الأعمال'],['3–15','الخلفية والأبحاث السابقة والفجوة'],['16–26','المنهجية: VMware وns-3 وأول تجربة (18–24) والبيئة الموحدة'],['27–32','إعادة بناء البروتوكولات الموجودة'],['33–41','تطور البروتوكول من v1 لـ v7.2'],['42–48','التصميم النهائي v8-Chain'],['49–62','النتايج والاستنتاجات والخلاصة'],['63–65','المراجع والشكر']].forEach(([a,b])=>c.push(B(`سلايد ${a}: ${b}`)));
S.forEach((s,k)=>{
  c.push(H1(`سلايد ${s.n} — ${titleOf(s.n)}`,true));
  c.push(thumb(s.n));
  c.push(box('السلايد بتتكلم عن إيه',[s.about]));
  c.push(H2('الشرح بالتفصيل'));
  s.detail.forEach(d=>c.push(B(d)));
  if(s.say){c.push(P('',{after:40}));c.push(box('تقوليها إزاي (بالإنجليزي)',[s.say],'F6E3E1',true));}
  if(s.qa&&s.qa.length){c.push(H2('أسئلة متوقعة'));s.qa.forEach(([q,a])=>{c.push(P([t('س: ',{b:true,c:RED}),t(q,{b:true})],{after:40,keepNext:true}));c.push(P([t('ج: ',{b:true,c:RED}),t(a)],{after:140}));});}
});
const doc=new Document({creator:'Rahma Khaled Oshba',title:'شرح الباور بوينت سلايد سلايد',
 styles:{default:{document:{run:{font:FNT,size:23,rightToLeft:true}}},paragraphStyles:[
  {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FNT,size:30,bold:true,color:RED},paragraph:{outlineLevel:0}}]},
 numbering:{config:[{reference:'bul',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.RIGHT,style:{paragraph:{indent:{right:360,hanging:260}}}}]}]},
 sections:[{properties:{bidi:true,page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
  footers:{default:new Footer({children:[new Paragraph({bidirectional:true,alignment:AlignmentType.LEFT,children:[new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:RED,bold:true}),t('   شرح الباور بوينت · v8-Chain',{size:16,c:'888888'})]})]})},
  children:c}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('Slide_by_Slide_Explanation_AR.docx',b);console.log('ok',b.length)});

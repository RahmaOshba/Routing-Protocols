const pptxgen=require('pptxgenjs');
const C={RED:'8A2522',CH:'323232',CREAM:'EDEDE5',WHITE:'FFFFFF',ROSE:'C9A09E',PINK:'F6E3E1',GREY:'6B6B6B',LINE:'D6D3C7',BAND:'F7F5EF',GOLD:'B8860B',GREEN:'4E7D3A'};
const FONT='Arial';
const pres=new pptxgen(); pres.layout='LAYOUT_WIDE'; pres.author='Rahma Khaled Oshba'; pres.title='Energy-Efficient Secure Clustering in WSNs — Thesis Defense';
let num=1;
// network motif: points + edges, drawn at an offset/scale
const NET={pts:[[0,0.05],[0.9,0.5],[1.8,0.15],[2.55,0.85],[1.35,1.25],[2.3,1.7],[0.65,1.05],[2.7,0.2],[1.9,2.25],[2.75,2.6]],
  edges:[[0,1],[1,2],[2,3],[1,4],[4,3],[4,5],[3,5],[1,6],[6,4],[2,7],[7,3],[5,8],[8,9],[5,9],[4,8]]};
function net(slide,ox,oy,s=1,color=C.RED,mirrorX=false,mirrorY=false,dot=C.CREAM){
  const P=NET.pts.map(([x,y])=>[ox+(mirrorX?-x:x)*s, oy+(mirrorY?-y:y)*s]);
  for(const [a,b] of NET.edges){const [x1,y1]=P[a],[x2,y2]=P[b];
    slide.addShape(pres.shapes.LINE,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.max(Math.abs(x2-x1),0.001),h:Math.max(Math.abs(y2-y1),0.001),flipV:(x2-x1)*(y2-y1)<0,line:{color,width:0.9}});}
  for(const [x,y] of P) slide.addShape(pres.shapes.OVAL,{x:x-0.045,y:y-0.045,w:0.09,h:0.09,fill:{color:dot},line:{color,width:0.9}});
}
function frame(slide,fill=C.CREAM){
  slide.background={color:C.CH};
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.22,y:0.22,w:12.89,h:7.06,rectRadius:0.28,fill:{color:fill},line:{color:fill,width:0}});
}
function title(slide,main,sub){
  const runs=[{text:main,options:{bold:true,color:C.RED,fontSize:28,fontFace:FONT}}];
  if(sub) runs.push({text:'  –  '+sub,options:{color:C.RED,fontSize:21,fontFace:FONT}});
  slide.addText(runs,{x:0.7,y:0.45,w:9.6,h:0.8,margin:0,valign:'middle',isTextBox:true});
}
function footer(slide){ num++;
  slide.addText('Energy-Efficient Secure Clustering in WSNs  ·  Rahma Khaled Oshba',{x:0.7,y:6.83,w:7,h:0.28,fontSize:9,color:'9A978C',fontFace:FONT,margin:0,isTextBox:true});
  slide.addText(String(num),{x:11.9,y:6.83,w:0.7,h:0.28,fontSize:10,bold:true,color:C.RED,align:'right',fontFace:FONT,margin:0,isTextBox:true});
}
function netTop(slide){const keep=[0,1,2,3,6,7]; const save=NET; 
  const pts=NET.pts; const ed=[[0,1],[1,2],[2,3],[1,6],[2,7],[7,3],[6,3]];
  const ox=10.25,oy=0.24; const P=pts.map(([x,y])=>[ox+x,oy+y]);
  for(const [a,b] of ed){const [x1,y1]=P[a],[x2,y2]=P[b];
    slide.addShape(pres.shapes.LINE,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.max(Math.abs(x2-x1),0.001),h:Math.max(Math.abs(y2-y1),0.001),flipV:(x2-x1)*(y2-y1)<0,line:{color:C.RED,width:0.9}});}
  for(const k of keep){const [x,y]=P[k]; slide.addShape(pres.shapes.OVAL,{x:x-0.045,y:y-0.045,w:0.09,h:0.09,fill:{color:C.CREAM},line:{color:C.RED,width:0.9}});}}
function content(main,sub,notes){const s=pres.addSlide(); frame(s); netTop(s); title(s,main,sub); footer(s); if(notes) s.addNotes(notes); return s;}
function section(n,main,sub,notes){const s=pres.addSlide(); frame(s,C.RED); num++;
  net(s,9.4,0.3,1.35,'E7C9C6',false,false,C.RED); net(s,0.6,7.1,0.72,'E7C9C6',false,true,C.RED);
  s.addText(n,{x:0.9,y:1.75,w:4,h:1.4,fontSize:88,bold:true,color:'E7C9C6',fontFace:FONT,margin:0,isTextBox:true});
  s.addText(main,{x:0.9,y:3.2,w:10.5,h:1.0,fontSize:40,bold:true,color:C.WHITE,fontFace:FONT,margin:0,isTextBox:true});
  if(sub) s.addText(sub,{x:0.9,y:4.25,w:10.5,h:0.9,fontSize:18,color:'F3E3E1',fontFace:FONT,margin:0,valign:'top',isTextBox:true});
  if(notes) s.addNotes(notes); return s;}
function text(slide,items,o){ // items: string | {t, b, sub:[...]} ; bullets
  const arr=[]; items.forEach((it,i)=>{
    if(typeof it==='string') arr.push({text:it,options:{bullet:{indent:16},breakLine:true}});
    else if(it.h) arr.push({text:it.h,options:{bold:true,color:C.RED,fontSize:(o.fontSize||15)+1,breakLine:true,paraSpaceBefore:i?8:0}});
    else arr.push({text:'',options:{bullet:{indent:16}}}), arr.pop(), arr.push({text:it.b,options:{bold:true,bullet:{indent:16}}}), arr.push({text:it.t,options:{breakLine:true}});
  });
  arr[arr.length-1].options.breakLine=false;
  slide.addText(arr,Object.assign({fontFace:FONT,fontSize:15,color:C.CH,paraSpaceAfter:6,valign:'top',margin:0.05,isTextBox:true},o));
}
function card(slide,x,y,w,h,head,body,o={}){
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.12,fill:{color:o.fill||C.WHITE},line:{color:o.border||C.LINE,width:1},shadow:{type:'outer',color:'000000',opacity:0.10,blur:6,offset:2,angle:90}});
  if(o.tag) { slide.addShape(pres.shapes.OVAL,{x:x+0.22,y:y+0.2,w:0.5,h:0.5,fill:{color:o.tagFill||C.RED},line:{color:o.tagFill||C.RED}});
    slide.addText(o.tag,{x:x+0.22,y:y+0.2,w:0.5,h:0.5,fontSize:o.tagSize||14,bold:true,color:C.WHITE,align:'center',valign:'middle',fontFace:FONT,margin:0,isTextBox:true}); }
  const tx=o.tag?x+0.85:x+0.22;
  slide.addText(head,{x:tx,y:y+0.15,w:w-(tx-x)-0.2,h:0.6,fontSize:o.headSize||15,bold:true,color:o.headColor||C.RED,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
  if(body) slide.addText(body,{x:x+0.22,y:y+0.8,w:w-0.44,h:h-0.95,fontSize:o.size||14,color:C.CH,valign:'top',fontFace:FONT,margin:0,paraSpaceAfter:4,isTextBox:true});
}
function stat(slide,x,y,w,big,label,o={}){
  slide.addText(big,{x,y,w,h:0.8,fontSize:o.size||36,bold:true,color:o.color||C.RED,fontFace:FONT,margin:0,align:o.align||'left',isTextBox:true});
  slide.addText(label,{x,y:y+0.8,w,h:0.6,fontSize:13.5,color:C.GREY,fontFace:FONT,margin:0,valign:'top',align:o.align||'left',isTextBox:true});
}
function table(slide,head,rows,o){
  const hl=o.hl||(()=>false); const center=o.center??1;
  const data=[head.map(h=>({text:h,options:{bold:true,color:C.WHITE,fill:{color:C.RED},align:'center',valign:'middle'}}))];
  rows.forEach((r,i)=>data.push(r.map((v,j)=>({text:String(v),options:{bold:hl(i)||(o.boldFirst&&j===0),color:C.CH,fill:{color:hl(i)?C.PINK:(i%2?C.WHITE:C.BAND)},align:j>=center?'center':'left',valign:'middle'}}))));
  slide.addTable(data,Object.assign({fontFace:FONT,fontSize:o.fs||14,rowH:o.rowH||0.42,border:{type:'solid',pt:0.75,color:C.LINE},margin:[3,6,3,6]},o.pos));
}
const CHART_BASE={catAxisLabelColor:'444444',valAxisLabelColor:'666666',catAxisLabelFontFace:FONT,valAxisLabelFontFace:FONT,catAxisLabelFontSize:11,valAxisLabelFontSize:10,
  valGridLine:{color:'E3E0D6',size:0.75},catGridLine:{style:'none'},showLegend:true,legendPos:'t',legendFontFace:FONT,legendFontSize:11,legendColor:'444444',
  plotArea:{fill:{color:C.CREAM}},chartArea:{fill:{color:C.CREAM}}};
function lifeChart(slide,labels,F,H,L,pos,o={}){
  slide.addChart(pres.charts.BAR,[{name:'FND',labels,values:F},{name:'HND',labels,values:H},{name:'LND',labels,values:L}],
    Object.assign({},CHART_BASE,{barDir:'col',barGrouping:'clustered',barGapWidthPct:60,chartColors:[C.ROSE,C.RED,C.CH],showValue:!!o.values,dataLabelFontSize:8,dataLabelColor:'333333',dataLabelPosition:'outEnd',
      showTitle:!!o.title,title:o.title,titleFontSize:13,titleColor:C.RED,titleFontFace:FONT,valAxisMinVal:0},pos));
}
function pdrChart(slide,labels,vals,pos,o={}){
  slide.addChart(pres.charts.BAR,[{name:'PDR (%)',labels,values:vals}],Object.assign({},CHART_BASE,{barDir:'col',chartColors:o.colors||[C.RED],showLegend:false,showValue:true,dataLabelFormatCode:'0.00',dataLabelFontSize:9,dataLabelPosition:'outEnd',
    valAxisMinVal:o.min??96,valAxisMaxVal:100,valAxisLabelFormatCode:'0.0',showTitle:!!o.title,title:o.title,titleFontSize:13,titleColor:C.RED,titleFontFace:FONT},pos));
}
function img(slide,path,x,y,w,h,pw,ph){ // contain
  const r=Math.min(w/pw,h/ph); const W=pw*r,H=ph*r; slide.addImage({path,x:x+(w-W)/2,y:y+(h-H)/2,w:W,h:H});
}
function arrowFlow(slide,items,x,y,w,h,o={}){ // horizontal process boxes
  const n=items.length,gap=o.gap||0.28,bw=(w-gap*(n-1))/n;
  items.forEach((it,i)=>{const bx=x+i*(bw+gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:bx,y,w:bw,h,rectRadius:0.1,fill:{color:it.fill||C.WHITE},line:{color:it.border||C.LINE,width:1}});
    slide.addText([{text:it.h,options:{bold:true,color:it.hc||C.RED,fontSize:o.hs||13,breakLine:!!it.t}},...(it.t?[{text:it.t,options:{fontSize:o.ts||10.5,color:C.CH}}]:[])],
      {x:bx+0.08,y:y+0.06,w:bw-0.16,h:h-0.12,align:'center',valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
    if(i<n-1) slide.addShape(pres.shapes.RIGHT_ARROW,{x:bx+bw+gap*0.15,y:y+h/2-0.11,w:gap*0.7,h:0.22,fill:{color:C.RED},line:{color:C.RED}});
  });
}
module.exports={pres,C,FONT,net,frame,title,footer,content,section,text,card,stat,table,lifeChart,pdrChart,img,arrowFlow};

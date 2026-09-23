const pptxgen=require('pptxgenjs');
const C={RED:'8A2522',CH:'323232',CREAM:'EDEDE5',WHITE:'FFFFFF',ROSE:'C9A09E',PINK:'F6E3E1',GREY:'6B6B6B',LINE:'D6D3C7',BAND:'F7F5EF',GOLD:'B8860B',GREEN:'4E7D3A'};
const FONT='Arial';
const pres=new pptxgen(); pres.layout='LAYOUT_WIDE'; pres.rtlMode=true; pres.author='Rahma Khaled Oshba'; pres.title='Clustering موفّر للطاقة وآمن في شبكات الحساسات — عرض المناقشة (عربي)';
let num=1;
const AR={rtlMode:true,fontFace:FONT,lang:'ar-EG'};
const NET={pts:[[0,0.05],[0.9,0.5],[1.8,0.15],[2.55,0.85],[1.35,1.25],[2.3,1.7],[0.65,1.05],[2.7,0.2],[1.9,2.25],[2.75,2.6]],
  edges:[[0,1],[1,2],[2,3],[1,4],[4,3],[4,5],[3,5],[1,6],[6,4],[2,7],[7,3],[5,8],[8,9],[5,9],[4,8]]};
function drawNet(slide,P,edges,keep,color,dot){
  for(const [a,b] of edges){const [x1,y1]=P[a],[x2,y2]=P[b];
    slide.addShape(pres.shapes.LINE,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.max(Math.abs(x2-x1),0.001),h:Math.max(Math.abs(y2-y1),0.001),flipV:(x2-x1)*(y2-y1)<0,line:{color,width:0.9}});}
  for(const k of keep){const [x,y]=P[k]; slide.addShape(pres.shapes.OVAL,{x:x-0.045,y:y-0.045,w:0.09,h:0.09,fill:{color:dot},line:{color,width:0.9}});}
}
function net(slide,ox,oy,s=1,color=C.RED,mirrorX=false,mirrorY=false,dot=C.CREAM){
  const P=NET.pts.map(([x,y])=>[ox+(mirrorX?-x:x)*s, oy+(mirrorY?-y:y)*s]); drawNet(slide,P,NET.edges,P.map((_,i)=>i),color,dot);}
function netTopL(slide){const P=NET.pts.map(([x,y])=>[3.08-x,0.24+y]); drawNet(slide,P,[[0,1],[1,2],[2,3],[1,6],[2,7],[7,3],[6,3]],[0,1,2,3,6,7],C.RED,C.CREAM);}
function frame(slide,fill=C.CREAM){ slide.background={color:C.CH};
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.22,y:0.22,w:12.89,h:7.06,rectRadius:0.28,fill:{color:fill},line:{color:fill,width:0}});}
function title(slide,main,sub){
  const runs=[{text:main,options:{bold:true,color:C.RED,fontSize:28}}];
  if(sub) runs.push({text:'  –  '+sub,options:{color:C.RED,fontSize:21}});
  slide.addText(runs,Object.assign({x:3.3,y:0.45,w:9.3,h:0.8,margin:0,valign:'middle',align:'right',isTextBox:true},AR));
}
function footer(slide){ num++;
  slide.addText('Clustering موفّر للطاقة في شبكات الحساسات  ·  رحمة خالد عشبة',Object.assign({x:5.6,y:6.83,w:7,h:0.28,fontSize:9,color:'9A978C',margin:0,align:'right',isTextBox:true},AR));
  slide.addText(String(num),{x:0.7,y:6.83,w:0.7,h:0.28,fontSize:10,bold:true,color:C.RED,align:'left',fontFace:FONT,margin:0,isTextBox:true});
}
function content(main,sub,notes){const s=pres.addSlide(); frame(s); netTopL(s); title(s,main,sub); footer(s); if(notes) s.addNotes(notes); return s;}
function section(n,main,sub,notes){const s=pres.addSlide(); frame(s,C.RED); num++;
  net(s,3.9,0.3,1.35,'E7C9C6',true,false,C.RED); net(s,12.7,7.1,0.72,'E7C9C6',true,true,C.RED);
  s.addText(n,{x:8.4,y:1.75,w:4,h:1.4,fontSize:88,bold:true,color:'E7C9C6',fontFace:FONT,margin:0,align:'right',isTextBox:true});
  s.addText(main,Object.assign({x:1.5,y:3.2,w:10.9,h:1.0,fontSize:40,bold:true,color:C.WHITE,margin:0,align:'right',isTextBox:true},AR));
  if(sub) s.addText(sub,Object.assign({x:1.5,y:4.25,w:10.9,h:0.9,fontSize:18,color:'F3E3E1',margin:0,valign:'top',align:'right',isTextBox:true},AR));
  if(notes) s.addNotes(notes); return s;}
function text(slide,items,o){
  const arr=[]; items.forEach((it,i)=>{
    if(typeof it==='string') arr.push({text:it,options:{bullet:{indent:16},breakLine:true}});
    else if(it.h) arr.push({text:it.h,options:{bold:true,color:C.RED,fontSize:(o.fontSize||15)+1,breakLine:true,paraSpaceBefore:i?8:0}});
    else {arr.push({text:it.b,options:{bold:true,bullet:{indent:16}}}); arr.push({text:it.t,options:{breakLine:true}});}
  });
  arr[arr.length-1].options.breakLine=false;
  slide.addText(arr,Object.assign({fontSize:15,color:C.CH,paraSpaceAfter:6,valign:'top',margin:0.05,align:'right',isTextBox:true},AR,o));
}
function card(slide,x,y,w,h,head,body,o={}){
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.12,fill:{color:o.fill||C.WHITE},line:{color:o.border||C.LINE,width:1},shadow:{type:'outer',color:'000000',opacity:0.10,blur:6,offset:2,angle:90}});
  if(o.tag){ const tx=x+w-0.72; slide.addShape(pres.shapes.OVAL,{x:tx,y:y+0.2,w:0.5,h:0.5,fill:{color:o.tagFill||C.RED},line:{color:o.tagFill||C.RED}});
    slide.addText(o.tag,{x:tx,y:y+0.2,w:0.5,h:0.5,fontSize:o.tagSize||14,bold:true,color:C.WHITE,align:'center',valign:'middle',fontFace:FONT,margin:0,isTextBox:true}); }
  const hw=o.tag?w-1.05:w-0.44;
  slide.addText(head,Object.assign({x:x+0.2,y:y+0.15,w:hw,h:0.6,fontSize:o.headSize||15,bold:true,color:o.headColor||C.RED,valign:'middle',margin:0,align:'right',isTextBox:true},AR));
  if(body) slide.addText(body,Object.assign({x:x+0.22,y:y+0.8,w:w-0.44,h:h-0.95,fontSize:o.size||14,color:C.CH,valign:'top',margin:0,paraSpaceAfter:4,align:'right',isTextBox:true},AR,o.ltr?{rtlMode:false,align:'left',fontFace:'Courier New'}:{}));
}
function stat(slide,x,y,w,big,label,o={}){
  slide.addText(big,{x,y,w,h:0.8,fontSize:o.size||36,bold:true,color:o.color||C.RED,fontFace:FONT,margin:0,align:'right',isTextBox:true});
  slide.addText(label,Object.assign({x,y:y+0.8,w,h:0.6,fontSize:13.5,color:C.GREY,margin:0,valign:'top',align:'right',isTextBox:true},AR));
}
function table(slide,head,rows,o){ // columns given in reading order (right→left); reversed for layout
  const hl=o.hl||(()=>false); const center=o.center??1; const n=head.length;
  const hd=head.map(h=>({text:h,options:{bold:true,color:C.WHITE,fill:{color:C.RED},align:'center',valign:'middle',rtlMode:true}})).reverse();
  const data=[hd];
  rows.forEach((r,i)=>data.push(r.map((v,j)=>({text:String(v),options:{bold:hl(i)||(o.boldFirst&&j===0),color:C.CH,fill:{color:hl(i)?C.PINK:(i%2?C.WHITE:C.BAND)},align:j>=center?'center':'right',valign:'middle',rtlMode:true}})).reverse()));
  const pos=Object.assign({},o.pos); if(pos.colW) pos.colW=[...pos.colW].reverse();
  slide.addTable(data,Object.assign({fontFace:FONT,fontSize:o.fs||14,rowH:o.rowH||0.42,border:{type:'solid',pt:0.75,color:C.LINE},margin:[3,6,3,6]},pos));
}
const CHART_BASE={catAxisLabelColor:'444444',valAxisLabelColor:'666666',catAxisLabelFontFace:FONT,valAxisLabelFontFace:FONT,catAxisLabelFontSize:11,valAxisLabelFontSize:10,
  valGridLine:{color:'E3E0D6',size:0.75},catGridLine:{style:'none'},showLegend:true,legendPos:'t',legendFontFace:FONT,legendFontSize:11,legendColor:'444444',plotArea:{fill:{color:C.CREAM}},chartArea:{fill:{color:C.CREAM}}};
function lifeChart(slide,labels,F,H,L,pos,o={}){
  slide.addChart(pres.charts.BAR,[{name:'FND',labels,values:F},{name:'HND',labels,values:H},{name:'LND',labels,values:L}],
    Object.assign({},CHART_BASE,{barDir:'col',barGrouping:'clustered',barGapWidthPct:60,chartColors:[C.ROSE,C.RED,C.CH],showTitle:!!o.title,title:o.title,titleFontSize:13,titleColor:C.RED,titleFontFace:FONT,valAxisMinVal:0},pos));}
function pdrChart(slide,labels,vals,pos,o={}){
  slide.addChart(pres.charts.BAR,[{name:'PDR (%)',labels,values:vals}],Object.assign({},CHART_BASE,{barDir:'col',chartColors:[C.RED],showLegend:false,showValue:true,dataLabelFormatCode:'0.00',dataLabelFontSize:9,dataLabelPosition:'outEnd',
    valAxisMinVal:o.min??96,valAxisMaxVal:100,valAxisLabelFormatCode:'0.0',showTitle:!!o.title,title:o.title,titleFontSize:13,titleColor:C.RED,titleFontFace:FONT},pos));}
function img(slide,path,x,y,w,h,pw,ph){const r=Math.min(w/pw,h/ph); const W=pw*r,H=ph*r; slide.addImage({path,x:x+(w-W)/2,y:y+(h-H)/2,w:W,h:H});}
function arrowFlow(slide,items,x,y,w,h,o={}){ // items in reading order; drawn right→left
  const n=items.length,gap=o.gap||0.28,bw=(w-gap*(n-1))/n;
  items.forEach((it,i)=>{const bx=x+w-bw-i*(bw+gap);
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:bx,y,w:bw,h,rectRadius:0.1,fill:{color:it.fill||C.WHITE},line:{color:it.border||C.LINE,width:1}});
    slide.addText([{text:it.h,options:{bold:true,color:it.hc||C.RED,fontSize:o.hs||13,breakLine:!!it.t}},...(it.t?[{text:it.t,options:{fontSize:o.ts||11,color:C.CH}}]:[])],
      Object.assign({x:bx+0.08,y:y+0.06,w:bw-0.16,h:h-0.12,align:'center',valign:'middle',margin:0,isTextBox:true},AR));
    if(i<n-1) slide.addShape(pres.shapes.LEFT_ARROW,{x:bx-gap*0.85,y:y+h/2-0.11,w:gap*0.7,h:0.22,fill:{color:C.RED},line:{color:C.RED}});
  });}
module.exports={pres,C,FONT,AR,net,frame,title,footer,content,section,text,card,stat,table,lifeChart,pdrChart,img,arrowFlow,num:()=>num};

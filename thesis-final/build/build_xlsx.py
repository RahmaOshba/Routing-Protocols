import json, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.worksheet.table import Table
D=json.load(open('data.json'))
RED='8A2522'; CHAR='323232'; CREAM='EDEDE5'; PINK='F6E3E1'; GREY='F7F7F4'
F=lambda **k: Font(name='Arial',**k)
thin=Side(style='thin',color='D0CFC6'); B=Border(bottom=thin)
HF=PatternFill('solid',fgColor=RED); BAND=PatternFill('solid',fgColor=CREAM); HL=PatternFill('solid',fgColor=PINK); NOF=PatternFill()
PCT='0.00%'; INT='#,##0'; DPCT='+0.0%;-0.0%;0.0%'; DPP='+0.00" pp";-0.00" pp";0.00" pp"'
wb=openpyxl.Workbook()
def title(ws,t,sub):
    ws['A1']=t; ws['A1'].font=F(bold=True,size=16,color=RED)
    ws['A2']=sub; ws['A2'].font=F(italic=True,size=10,color='666666')
    ws.sheet_view.showGridLines=False
def header(ws,r,cols,calc=()):
    for j,h in enumerate(cols,1):
        c=ws.cell(r,j,h); c.font=F(bold=True,color='FFFFFF',size=10); c.fill=HF if j not in calc else PatternFill('solid',fgColor=CHAR)
        c.alignment=Alignment(wrap_text=True,vertical='center',horizontal='center')
    ws.row_dimensions[r].height=32
def row(ws,r,vals,fmts,hl=False,band=False):
    for j,v in enumerate(vals,1):
        c=ws.cell(r,j,v); c.font=F(size=10,bold=hl); c.border=B
        c.fill=HL if hl else (BAND if band else NOF)
        if j in fmts: c.number_format=fmts[j]
        c.alignment=Alignment(vertical='center',wrap_text=isinstance(v,str) and len(v)>28)
def widths(ws,ws_):
    for col,w in ws_.items(): ws.column_dimensions[col].width=w

# ---------- README
ws=wb.active; ws.title='README'
title(ws,'WSN Clustering Protocols — Comparison Workbook','Energy-Efficient Secure Clustering in WSNs Using Hybrid Cryptography — Eng. Rahma Khaled Oshba')
lines=[('How to read this workbook',None),
 ('Dashboard','Headline results and charts: the best configuration of every protocol family side by side.'),
 ('Unified Comparison','Every protocol and every proposed version in the SAME environment (100 nodes, 100×100 m, BS center). Ranks and deltas are formulas.'),
 ('Reproduction','Published paper numbers vs. our paper-exact reproduction vs. the unified environment, with gaps as formulas.'),
 ('Proposed Evolution','v1 → v8-Chain, one mechanism change per version; Δ vs. previous version and vs. v1 are formulas.'),
 ('Center vs Far BS','The same protocol with the BS at the field center (50,50) and far away (50,−100).'),
 ('v8 Analysis','Leave-one-out ablation, CH routing-mode comparison and 8-topology robustness of the final protocol.'),
 ('',None),('Conventions',None),
 ('Red header','Simulation output (entered values).'),
 ('Charcoal header','Calculated column (formula) — do not type over it.'),
 ('Pink row','Final proposed protocol (v8 / v8-Chain).'),
 ('FND / HND / LND','Round in which the first / half / last node died (higher is better).'),
 ('PDR','Packets delivered to the BS ÷ packets generated over the whole lifetime.'),
 ('',None),('Simulation environment',None)]+[(a,b) for a,b in D['env']]+[('',None),('References',None)]+[(f'[{i}]',r) for i,r in enumerate(D['refs'],1)]
r=4
for a,b in lines:
    ws.cell(r,1,a).font=F(bold=True,size=11 if b is None else 10,color=RED if b is None else CHAR)
    if b: ws.cell(r,2,b).font=F(size=10); ws.cell(r,2).alignment=Alignment(wrap_text=True)
    r+=1
widths(ws,{'A':26,'B':110})

# ---------- Unified Comparison
ws=wb.create_sheet('Unified Comparison')
title(ws,'Unified-environment comparison (BS at field center)','All rows: 100 nodes, 100×100 m, E0 = 0.5 J, 2000-bit packets, two-slope radio, seed 12345. Rank 1 = best.')
cols=['Family','Protocol / Version','Stage','Mechanism','FND','HND','LND','PDR','LND vs LEACH','FND ÷ LND (balance)','Rank LND','Rank PDR']
header(ws,4,cols,calc=(9,10,11,12))
rows=[(f,p,s,n,a,b,c,d) for f,p,s,a,b,c,d,n in D['unified']]
for v in D['proposed']:
    if v[1]=='Center': rows.append(('Proposed',v[0],'Proposed',v[3],v[4],v[5],v[6],v[7]))
first=5; last=first+len(rows)-1
for i,rw in enumerate(rows):
    r=first+i
    vals=list(rw)+[f'=G{r}/$G${first}-1',f'=E{r}/G{r}',f'=RANK(G{r},$G${first}:$G${last})',f'=RANK(H{r},$H${first}:$H${last})']
    row(ws,r,vals,{5:INT,6:INT,7:INT,8:PCT,9:DPCT,10:'0.00'},hl=rw[1].startswith('v8'),band=i%2==0)
ws.cell(last+2,1,'LND vs LEACH uses LEACH (Edited) as the reference. FND ÷ LND close to 1 means nodes die close together (balanced load). v5b LND is inflated by stranded, silent nodes (its last 1038 rounds delivered 59 packets).').font=F(italic=True,size=9,color='666666')
ws.freeze_panes='C5'
widths(ws,{'A':16,'B':24,'C':15,'D':52,'E':9,'F':9,'G':9,'H':10,'I':12,'J':12,'K':9,'L':9})
UNI=(first,last)

# ---------- Reproduction
ws=wb.create_sheet('Reproduction')
title(ws,'Published results vs. our reproductions','Published = as reported in each original paper (different settings per paper). Paper-exact = our code in the paper\'s own settings. Unified = our code in the common environment.')
cols=['Protocol','Published FND','Published LND','Paper-exact FND','Paper-exact HND','Paper-exact LND','Paper-exact PDR','Unified FND','Unified HND','Unified LND','Unified PDR','Paper-exact vs Published (LND)','Unified vs Paper-exact (LND)','Paper-exact settings','Published source']
header(ws,4,cols,calc=(12,13))
pub={p[0]:p for p in D['published']}; uni={}
for f,p,s,a,b,c,d,n in D['unified']:
    if s=='Edited' and p not in uni: uni[p]=(a,b,c,d)
for i,pe in enumerate(D['paperExact']):
    r=5+i; p=pe[0]; pb=pub[p]; u=uni[p]
    vals=[p,pb[1] if pb[1] else 'n/a',pb[3] if pb[3] else ('graph only' if p in('HEED','SH-LEACH') else 'n/a'),pe[1],pe[2],pe[3],pe[4],u[0],u[1],u[2],u[3],
          f'=IF(ISNUMBER(C{r}),F{r}/C{r}-1,"n/a")',f'=J{r}/F{r}-1',pe[5],pb[5]]
    row(ws,r,vals,{2:INT,3:INT,4:INT,5:INT,6:INT,7:PCT,8:INT,9:INT,10:INT,11:PCT,12:DPCT,13:DPCT},band=i%2==0)
n=5+len(D['paperExact'])+1
ws.cell(n,1,'H-LEACH published LND is read from the paper\'s Fig. 2 (≈4312). The unified environment differs in field size, BS position, radio model, packet size and initial energy, so the Unified column is the only fair basis for comparing protocols with each other.').font=F(italic=True,size=9,color='666666')
ws.freeze_panes='B5'
widths(ws,{'A':12,'B':11,'C':11,'D':11,'E':11,'F':11,'G':11,'H':10,'I':10,'J':10,'K':10,'L':14,'M':14,'N':40,'O':44})

# ---------- Proposed Evolution
ws=wb.create_sheet('Proposed Evolution')
title(ws,'Proposed protocol — version-by-version evolution','Each version changes one mechanism. Δ columns are formulas: vs. the previous row and vs. v1.')
cols=['Version','BS','Setup interval','Change introduced','FND','HND','LND','PDR','Δ FND vs prev','Δ LND vs prev','Δ PDR vs prev','Δ LND vs v1']
header(ws,4,cols,calc=(9,10,11,12))
for i,v in enumerate(D['proposed']):
    r=5+i
    prev=[f'=E{r}/E{r-1}-1',f'=G{r}/G{r-1}-1',f'=(H{r}-H{r-1})*100'] if i else ['—','—','—']
    row(ws,r,[v[0],v[1],v[2],v[3],v[4],v[5],v[6],v[7]]+prev+[f'=G{r}/$G$5-1'],{5:INT,6:INT,7:INT,8:PCT,9:DPCT,10:DPCT,11:DPP,12:DPCT},hl=v[0].startswith('v8'),band=i%2==0)
EV=(5,4+len(D['proposed']))
ws.cell(EV[1]+2,1,'Rows are in the order they were developed. Center and Far-BS variants of v6/v7/v8 are controlled pairs (only the BS position differs): compare them on the "Center vs Far BS" sheet, not row-to-row here.').font=F(italic=True,size=9,color='666666')
ch=LineChart(); ch.title='Lifetime across the proposed versions (BS center)'; ch.y_axis.title='Rounds'; ch.height=9; ch.width=24
centre=[i for i,v in enumerate(D['proposed']) if v[1]=='Center']
# helper block for chart (center rows only)
hb=EV[1]+5
ws.cell(hb-1,1,'Chart data (center-BS versions, formulas)').font=F(bold=True,size=10,color=RED)
for k,t in enumerate(['Version','FND','HND','LND','PDR']): ws.cell(hb,k+1,t).font=F(bold=True,size=9)
for j,i in enumerate(centre):
    r=hb+1+j; src=5+i
    ws.cell(r,1,f'=A{src}'); ws.cell(r,2,f'=E{src}'); ws.cell(r,3,f'=F{src}'); ws.cell(r,4,f'=G{src}'); ws.cell(r,5,f'=H{src}')
    for k in range(1,6): ws.cell(r,k).font=F(size=9)
    ws.cell(r,5).number_format=PCT
end=hb+len(centre)
ch.add_data(Reference(ws,min_col=2,max_col=4,min_row=hb,max_row=end),titles_from_data=True)
ch.set_categories(Reference(ws,min_col=1,min_row=hb+1,max_row=end))
for s,c in zip(ch.series,['C9A09E','8A2522','323232']): s.graphicalProperties.line.solidFill=c; s.graphicalProperties.line.width=28000; s.smooth=False
ws.add_chart(ch,f'G{hb-1}')
ws.freeze_panes='B5'
widths(ws,{'A':22,'B':8,'C':9,'D':54,'E':9,'F':9,'G':9,'H':10,'I':11,'J':11,'K':11,'L':11})

# ---------- Center vs Far
ws=wb.create_sheet('Center vs Far BS')
title(ws,'Controlled BS-placement pairs','Same code and seed; only the BS position changes: center (50,50) vs far (50,−100). Δ = Far vs Center (formulas).')
cols=['Protocol','FND Center','HND Center','LND Center','PDR Center','FND Far','HND Far','LND Far','PDR Far','Δ FND','Δ LND','Δ PDR']
header(ws,4,cols,calc=(10,11,12))
pairs=[('v5b (Energy-Aware)',(1730,2091,3203,0.973087),(1055,1616,1861,0.982785)),
       ('v6 (ordered chain)',(1551,1981,2106,0.97494),(1266,1910,2031,0.97075)),
       ('v7 (chain + backup + repair)',(1551,1976,2066,0.98432),(1266,1891,1976,0.98135)),
       ('v8',(2621,2711,2761,0.992224),(1471,1646,1716,0.986599)),
       ('v8-Chain (energy-aware relay)',(2621,2711,2756,0.992668),(1716,1886,1956,0.990719))]
for i,(p,c,f) in enumerate(pairs):
    r=5+i
    row(ws,r,[p,*c,*f,f'=F{r}/B{r}-1',f'=H{r}/D{r}-1',f'=(I{r}-E{r})*100'],{2:INT,3:INT,4:INT,5:PCT,6:INT,7:INT,8:INT,9:PCT,10:DPCT,11:DPCT,12:DPP},hl=p.startswith('v8-Chain'),band=i%2==0)
ch=BarChart(); ch.type='col'; ch.grouping='clustered'; ch.title='Far-BS lifetime by protocol'; ch.y_axis.title='Rounds'; ch.height=8.5; ch.width=20
ch.add_data(Reference(ws,min_col=6,max_col=8,min_row=4,max_row=9),titles_from_data=True)
ch.set_categories(Reference(ws,min_col=1,min_row=5,max_row=9))
for s,c in zip(ch.series,['C9A09E','8A2522','323232']): s.graphicalProperties.solidFill=c; s.graphicalProperties.line.solidFill=c
ws.add_chart(ch,'A12')
widths(ws,{'A':30,'B':10,'C':10,'D':10,'E':10,'F':10,'G':10,'H':10,'I':10,'J':10,'K':10,'L':11})

# ---------- v8 Analysis
ws=wb.create_sheet('v8 Analysis')
title(ws,'v8 / v8-Chain — ablation, routing and robustness','A. Each ablation row disables ONE mechanism. B. CH routing mode. C. Mean of 8 random topologies.')
ws['A4']='A. Leave-one-out ablation (BS center, seed 12345)'; ws['A4'].font=F(bold=True,size=11,color=RED)
cols=['Variant','Mechanism removed','FND','HND','LND','PDR','Delivered packets','Δ FND vs full','Δ Delivered vs full']
header(ws,5,cols,calc=(8,9))
for i,a in enumerate(D['ablation']):
    r=6+i
    row(ws,r,a+[f'=C{r}/$C$6-1',f'=G{r}/$G$6-1'],{3:INT,4:INT,5:INT,6:PCT,7:INT,8:DPCT,9:DPCT},hl=i==0,band=i%2==0)
r0=6+len(D['ablation'])+2
ws.cell(r0,1,'B. CH routing mode (seed 12345 and 8-seed mean)').font=F(bold=True,size=11,color=RED)
cols=['Routing mode','BS','FND','HND','LND','PDR','Mean FND','Mean HND','Mean LND','Mean PDR']
header(ws,r0+1,cols)
for i,x in enumerate(D['routing']):
    row(ws,r0+2+i,x,{3:INT,4:INT,5:INT,6:PCT,7:INT,8:INT,9:INT,10:PCT},hl=x[0].startswith('Energy-aware'),band=i%2==0)
r1=r0+2+len(D['routing'])+2
ws.cell(r1,1,'C. Robustness — mean of 8 topologies (seeds 12345, 1, 7, 42, 99, 2024, 31337, 555)').font=F(bold=True,size=11,color=RED)
header(ws,r1+1,['Protocol','BS','Mean FND','Mean HND','Mean LND','Mean PDR'])
for i,x in enumerate(D['robust']):
    row(ws,r1+2+i,x,{3:INT,4:INT,5:INT,6:PCT},hl=x[0]=='v8',band=i%2==0)
ws.cell(r1+2+len(D['robust'])+1,1,'Reading: direct-to-BS (I4) and the energy gate (I5) carry most of the v8 lifetime gain; I1 and I3 are safety nets with no effect in the full combination for this seed. The energy-aware relay never fires at the center BS and forms a chain on its own at the far BS.').font=F(italic=True,size=9,color='666666')
widths(ws,{'A':30,'B':26,'C':10,'D':10,'E':10,'F':10,'G':14,'H':12,'I':12,'J':10})

# ---------- Dashboard (first after README)
ws=wb.create_sheet('Dashboard',1)
title(ws,'Dashboard — best configuration of each family (BS center)','Values are pulled from "Unified Comparison" with INDEX/MATCH, so they update if that sheet changes.')
pick=['LEACH','HEED','PEGASIS','SH-LEACH','H-LEACH','v3','v7 (Center)','v7.1 Multihop (Int 5)','v8-Chain (Center)']
stage={'SH-LEACH':'Improved','H-LEACH':'Improved'}
header(ws,4,['Protocol','Stage','FND','HND','LND','PDR'],calc=(3,4,5,6))
U="'Unified Comparison'"
for i,p in enumerate(pick):
    r=5+i; st=stage.get(p,'Edited' if not p.startswith('v') else 'Proposed')
    ws.cell(r,1,p); ws.cell(r,2,st)
    key=f'MATCH(1,INDEX(({U}!$B${UNI[0]}:$B${UNI[1]}=A{r})*({U}!$C${UNI[0]}:$C${UNI[1]}=B{r}),0),0)'
    for j,col in zip(range(3,7),'EFGH'):
        ws.cell(r,j,f'=INDEX({U}!${col}${UNI[0]}:${col}${UNI[1]},{key})')
    for j in range(1,7):
        c=ws.cell(r,j); c.font=F(size=10,bold=p.startswith('v8')); c.border=B; c.fill=HL if p.startswith('v8') else (BAND if i%2==0 else NOF)
        c.number_format=PCT if j==6 else INT
lastd=5+len(pick)-1
ws.cell(lastd+2,1,'Headline').font=F(bold=True,size=11,color=RED)
kp=[('v8-Chain FND vs best literature hybrid (SH-LEACH Improved)',f'=C{lastd}/C8-1',DPCT),
    ('v8-Chain FND vs LEACH',f'=C{lastd}/C5-1',DPCT),
    ('v8-Chain PDR vs v7 (Center)',f'=(F{lastd}-F11)*100',DPP),
    ('v8-Chain Far-BS FND vs v7 Far-BS',"='Center vs Far BS'!F9/'Center vs Far BS'!F7-1",DPCT)]
for k,(a,f,fm) in enumerate(kp):
    r=lastd+3+k; ws.cell(r,1,a).font=F(size=10); c=ws.cell(r,3,f); c.number_format=fm; c.font=F(bold=True,size=12,color=RED)
ch=BarChart(); ch.type='col'; ch.grouping='clustered'; ch.title='Network lifetime (rounds)'; ch.height=9; ch.width=22
ch.add_data(Reference(ws,min_col=3,max_col=5,min_row=4,max_row=lastd),titles_from_data=True)
ch.set_categories(Reference(ws,min_col=1,min_row=5,max_row=lastd))
for s,c in zip(ch.series,['C9A09E','8A2522','323232']): s.graphicalProperties.solidFill=c; s.graphicalProperties.line.solidFill=c
ws.add_chart(ch,'H4')
ch2=BarChart(); ch2.type='col'; ch2.title='Packet Delivery Ratio'; ch2.height=7.5; ch2.width=22; ch2.legend=None
ch2.add_data(Reference(ws,min_col=6,max_col=6,min_row=4,max_row=lastd),titles_from_data=True)
ch2.set_categories(Reference(ws,min_col=1,min_row=5,max_row=lastd))
ch2.y_axis.scaling.min=0.96; ch2.y_axis.scaling.max=1.0; ch2.y_axis.number_format='0.0%'
ch2.series[0].graphicalProperties.solidFill='8A2522'
ch2.dataLabels=DataLabelList(); ch2.dataLabels.showVal=True; ch2.dataLabels.showSerName=False; ch2.dataLabels.showCatName=False; ch2.dataLabels.showLegendKey=False; ch2.dataLabels.numFmt='0.00%'
ws.add_chart(ch2,'H23')
widths(ws,{'A':30,'B':11,'C':10,'D':10,'E':10,'F':10})
for w in wb.worksheets:
    w.page_setup.orientation='landscape'; w.sheet_properties.pageSetUpPr.fitToPage=True; w.page_setup.fitToWidth=1; w.page_setup.fitToHeight=0
wb.save('WSN_Protocol_Comparison.xlsx'); print('saved')

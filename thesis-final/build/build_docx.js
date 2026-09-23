const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,WidthType,ShadingType,AlignmentType,HeadingLevel,ImageRun,BorderStyle,LevelFormat,Footer,PageNumber,TabStopType,PageBreak}=require('docx');
const D=JSON.parse(fs.readFileSync('data.json'));
const RED='8A2522',CH='323232',CREAM='EDEDE5',PINK='F6E3E1';
const W=9638; // A4 minus 2 cm margins
const t=(s,o={})=>new TextRun({text:s,font:'Arial',size:o.size||21,bold:o.b,italics:o.i,color:o.c||CH});
const P=(runs,o={})=>new Paragraph({children:(typeof runs==='string'?[t(runs,o)]:runs),spacing:{after:o.after??120,before:o.before??0,line:o.line||276,lineRule:'auto'},alignment:o.align,keepNext:o.keepNext});
const H1=s=>new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun({text:s,font:'Arial',size:30,bold:true,color:RED})],spacing:{before:320,after:140},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:RED,space:4}},keepNext:true});
const H2=s=>new Paragraph({heading:HeadingLevel.HEADING_2,children:[new TextRun({text:s,font:'Arial',size:24,bold:true,color:CH})],spacing:{before:200,after:100},keepNext:true});
const B=(s,lvl=0)=>new Paragraph({numbering:{reference:'bul',level:lvl},children:(typeof s==='string'?[t(s)]:s),spacing:{after:60,line:264}});
const border={style:BorderStyle.SINGLE,size:4,color:'D0CFC6'};
const borders={top:border,bottom:border,left:border,right:border};
function table(head,rows,widths,opt={}){
  const tot=widths.reduce((a,b)=>a+b,0);
  const mk=(v,j,i,hdr)=>new TableCell({width:{size:widths[j],type:WidthType.DXA},borders,
     shading:{type:ShadingType.CLEAR,color:'auto',fill:hdr?RED:(opt.hl&&opt.hl(i)?PINK:(i%2===0?CREAM:'FFFFFF'))},
     margins:{top:50,bottom:50,left:90,right:90},
     children:[new Paragraph({alignment:(j>=(opt.numFrom??99))?AlignmentType.CENTER:AlignmentType.LEFT,children:[new TextRun({text:String(v),font:'Arial',size:opt.size||17,bold:hdr||(opt.hl&&opt.hl(i)),color:hdr?'FFFFFF':CH})]})]});
  return new Table({width:{size:tot,type:WidthType.DXA},columnWidths:widths,rows:[
    new TableRow({tableHeader:true,children:head.map((h,j)=>mk(h,j,-1,true))}),
    ...rows.map((r,i)=>new TableRow({cantSplit:true,children:r.map((v,j)=>mk(v,j,i,false))}))]});
}
const cap=s=>P([t(s,{i:true,size:18,c:'555555'})],{align:AlignmentType.CENTER,after:220,before:60});
function img(file,wIn){const buf=fs.readFileSync(file);const [pw,ph]=[buf.readUInt32BE(16),buf.readUInt32BE(20)];
  const w=wIn*96,h=w*ph/pw; return new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{before:120,after:40},children:[new ImageRun({type:'png',data:buf,transformation:{width:w,height:h},altText:{title:file,description:file,name:file}})]});}
const pct=v=>(v*100).toFixed(2)+'%';
function callout(title,lines){return new Table({width:{size:W,type:WidthType.DXA},columnWidths:[W],rows:[new TableRow({children:[new TableCell({width:{size:W,type:WidthType.DXA},
  borders:{top:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},bottom:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},right:{style:BorderStyle.NONE,size:0,color:'FFFFFF'},left:{style:BorderStyle.SINGLE,size:24,color:RED}},
  shading:{type:ShadingType.CLEAR,color:'auto',fill:CREAM},margins:{top:120,bottom:120,left:200,right:200},
  children:[P([t(title,{b:true,c:RED})],{after:80}),...lines.map(l=>P(typeof l==='string'?[t(l,{size:20})]:l,{after:60}))]})]})]});}

const children=[];
// ---- title block
children.push(P([t('STATE-OF-THE-ART REPORT',{b:true,size:20,c:RED})],{after:60}));
children.push(P([t('Energy-Efficient Secure Clustering in Wireless Sensor Networks Using Hybrid Cryptography',{b:true,size:40})],{after:120,line:252}));
children.push(P([t('From LEACH, HEED and PEGASIS to the proposed v8-Chain protocol — results, evidence and rationale',{i:true,size:22,c:'555555'})],{after:240}));
children.push(P([t('Eng. Rahma Khaled Oshba',{b:true,size:21}),t('   ·   Supervised by Dr. Hesham ElZouka, Dr. Amani Saad, Dr. Khaled Saada',{size:21,c:'555555'})],{after:300}));
children.push(callout('Key results',[
 [t('Final protocol: ',{b:true,size:20}),t('v8-Chain — single-pass energy × connectivity CH selection, 5-round cluster reuse, proactive CH handover plus backup failover, direct-to-BS delivery for nodes near the sink, energy-gated CH election, and an energy-aware CH-to-CH relay.',{size:20})],
 [t('BS at the field center: ',{b:true,size:20}),t('FND 2621 / HND 2711 / LND 2756 rounds, PDR 99.27% — the latest first-node death of every protocol reproduced, and a higher PDR than any protocol with a comparable lifetime (H-LEACH Improved: FND 2347, PDR 97.33%; v7: FND 1551, PDR 98.43%). Only HEED and SH-LEACH deliver slightly more (99.7–99.8%), but their first node dies 1,200–2,300 rounds earlier.',{size:20})],
 [t('Far BS (50, −100): ',{b:true,size:20}),t('FND 1716 / HND 1886 / LND 1956, PDR 99.07% — FND +36% and PDR +0.93 pp over the chain-based v7, with HND/LND within 1%.',{size:20})],
 [t('Robustness: ',{b:true,size:20}),t('same ranking across 8 random topologies (mean center FND 2618, PDR 99.25%).',{size:20})]]));

// ---- 1 Introduction
children.push(H1('1. Introduction'));
children.push(P('A wireless sensor network (WSN) consists of many small, battery-powered nodes that sense their environment and forward readings to a base station (BS, or sink). Batteries are rarely replaceable, and radio communication — especially over long distances — dominates energy use, so the way nodes are organised and how data reaches the sink decides how long the network remains useful.'));
children.push(P('Clustering groups nodes under a rotating cluster head (CH) that aggregates its members\' data and forwards one packet towards the sink. It is the dominant energy-saving architecture, but it moves the burden onto the CHs: a poorly chosen or over-used CH dies early, its cluster loses connectivity, and packets are lost.'));
children.push(P([t('Research question. ',{b:true}),t('How can CH selection, cluster maintenance and inter-cluster routing be designed together so that a WSN lives longer and delivers more of its data, without adding significant control overhead?')]));
children.push(P([t('Contributions of this work',{b:true})],{after:60,keepNext:true}));
[ 'A reproduction of five published protocols (LEACH, HEED, PEGASIS, SH-LEACH, H-LEACH) plus EECH-HEED, first under each paper\'s own settings and then in one unified ns-3 environment, so that they can be compared fairly.',
  'Targeted corrections of two literature hybrids whose published algorithms could not work as described (H-LEACH deadlock, SH-LEACH single doubling).',
  'An original hybrid protocol evolved through controlled, one-mechanism-at-a-time versions (v1 → v8-Chain), each measured with FND, HND, LND and PDR.',
  'A final design, v8-Chain, that protects cluster heads both before and after failure and adapts its routing to the sink position automatically.'].forEach(s=>children.push(B(s)));

// ---- 2 Background
children.push(H1('2. Background'));
children.push(H2('2.1 Clustering and routing in WSNs'));
children.push(P('In a clustered WSN, each round has a setup phase (CHs are elected and nodes join a CH) and a steady-state phase (members send data to their CH; the CH aggregates and forwards). Two families dominate the literature: cluster-based protocols such as LEACH and HEED, where every CH talks to the sink, and chain-based protocols such as PEGASIS, where data is passed along a chain of nodes and a leader transmits to the sink.'));
children.push(H2('2.2 Radio energy model'));
children.push(P('All protocols in this study use the first-order radio model with two path-loss regimes. Transmitting k bits over distance d costs E_TX(k,d) = E_elec·k + E_fs·k·d² when d < d0 (free space), and E_elec·k + E_mp·k·d⁴ when d ≥ d0 (multipath); receiving costs E_RX(k) = E_elec·k, and aggregation costs E_DA per bit. The threshold d0 = √(E_fs/E_mp) ≈ 87.7 m. Because cost grows with d² and then d⁴, short hops and fewer long-range transmissions are the main levers for saving energy — the principle behind both the direct-to-BS rule and the energy-aware relay in v8-Chain.'));
children.push(H2('2.3 Performance metrics'));
[['FND / HND / LND','Round in which the first node, half of the nodes and the last node die. FND reflects load balance and coverage stability; HND and LND reflect overall lifetime.'],
 ['PDR','Packets delivered to the BS ÷ packets generated over the whole network lifetime.'],
 ['Delivered packets','Total data that actually reached the BS — used to expose "alive but silent" nodes that inflate LND.']].forEach(([a,b])=>children.push(B([t(a+': ',{b:true}),t(b)])));

// ---- 3 Related work
children.push(H1('3. Related Work and Research Gap'));
children.push(table(['Protocol (year)','Core mechanism','Strength','Limitation addressed in this work'],[
 ['LEACH (2000) [1]','Probabilistic CH rotation with a threshold T(n); nodes join the nearest CH','Simple, distributed, balanced rotation','CH choice ignores residual energy and connectivity'],
 ['HEED (2004) [2]','CH probability ∝ residual energy; iterative negotiation with communication cost','Better-informed CHs, high PDR','Iterative control overhead every round; short lifetime in our tests'],
 ['PEGASIS (2002) [3]','Greedy chain of all nodes; one rotating leader per round','Very long lifetime, short hops','Single chain: delay and a single point of failure'],
 ['SH-LEACH (2015) [4]','LEACH + HEED-style probability doubling','Delays first node death','Formula applies one doubling only; no failure recovery'],
 ['H-LEACH (2016) [5]','Energy-gated CH eligibility (energy > average)','Energy-aware election','Literal gate never fires with equal energy (deadlock)'],
 ['EECH-HEED (2025) [6]','HEED + EECH zones + adaptive threshold sensing','Longest raw lifetime (fewer transmissions)','Not a LEACH+HEED hybrid; used as context only'],
 ['TLC-LEACH (2024) [7], DL-HEED (2025) [8], RL-ILEACH (2026) [9]','Two-level grids; graph neural network; Q-learning in CH selection','Specialised gains','No cluster reuse, failure recovery or relay combined']],
 [1900,2900,1900,2938],{size:16}));
children.push(P('',{after:60}));
children.push(P([t('Research gap. ',{b:true}),t('Each approach improves one part of the problem. None combines (1) energy- and connectivity-aware CH selection, (2) low-overhead multi-round cluster reuse, (3) cluster-head failure recovery and (4) an inter-cluster relay that adapts to where the sink is. The proposed protocol integrates all four.')]));

// ---- 4 Methodology
children.push(H1('4. Methodology'));
children.push(P('The study followed seven steps: literature review → protocol reconstruction → unified simulation environment → targeted protocol modification → proposed hybrid protocol → controlled experiments → performance analysis. Every published protocol was first reproduced under its own paper\'s settings to validate the code, and only then moved into the unified environment below, so that differences between protocols are due to the algorithms and not to the settings.'));
children.push(table(['Parameter','Value'],D.env.slice(0,14),[4000,5638],{size:17}));
children.push(P('',{after:60}));
children.push(P([t('PHY/MAC sanity check. ',{b:true}),t('Before relying on the analytical energy model, a small IEEE 802.15.4 (LR-WPAN) scenario with real PHY/MAC layers, log-distance path loss and a per-state energy source was run in ns-3 (3 sensors + 1 sink, 1000 s): 300/300 packets delivered (PDR 100%), 120 bit/s throughput, 62.64 J consumed per node out of 100 J.')]));

// ---- 5 Reproduction
children.push(H1('5. Reproduction of Existing Protocols'));
const pe={};D.paperExact.forEach(r=>pe[r[0]]=r);const pub={};D.published.forEach(r=>pub[r[0]]=r);
const uni=D.unified;
const rep=[['LEACH','Edited'],['HEED','Edited'],['PEGASIS','Edited'],['SH-LEACH','Edited'],['SH-LEACH','Improved'],['H-LEACH','Edited'],['H-LEACH','Improved'],['EECH-HEED','Edited'],['EECH-HEED','Improved']].map(([p,s])=>{
  const u=uni.find(r=>r[1]===p&&r[2]===s);const pb=pub[p];const px=pe[p];
  return [s==='Edited'?p:p+' (improved)', s==='Edited'?(pb[3]?(p==='H-LEACH'?'≈'+pb[3]:pb[3]):'graph only'):'', s==='Edited'?px[3]:'', u[3],u[4],u[5],pct(u[6])];});
children.push(table(['Protocol','Published LND','Paper-exact LND','Unified FND','Unified HND','Unified LND','Unified PDR'],rep,[2300,1250,1250,1200,1200,1200,1238],{size:17,numFrom:1,hl:i=>rep[i][0].includes('improved')}));
children.push(P('',{after:60}));
children.push(P([t('What the reproduction showed. ',{b:true}),t('PEGASIS matched its paper within 2.3% on all three lifetime metrics. H-LEACH, as literally written, never elects a CH: with equal initial energy no node is strictly above the average, so a fallback was required just to run it; relaxing the gate to 0.8× the average let the energy-weighted rule actually decide, improving FND/HND/LND by 7.8–8.6% at no PDR cost. SH-LEACH applied a single probability doubling instead of HEED\'s iterative doubling; correcting it improved HND, LND and PDR but lowered FND (fewer, larger clusters). HEED gave the highest reliability (PDR 99.69%) but the shortest lifetime, because its iterative CH negotiation is paid every round. EECH-HEED reaches the longest raw lifetime only because its adaptive sensing transmits less often, so it is kept as context.')]));
children.push(img('fig/families.png',6.5));
children.push(cap('Figure 1 — Best configuration of each family in the unified environment (BS at center).'));

// ---- 6 Evolution
children.push(H1('6. Evolution of the Proposed Protocol'));
children.push(P('The protocol was developed in versions that each change one mechanism, so the effect of every change can be measured on its own.'));
const ev=D.proposed.filter(v=>!['v6 (Far BS)','v7 (Far BS)','v8 (Far BS)','v8-Chain (Far BS)'].includes(v[0]));
children.push(table(['Version','Change introduced','Int.','FND','HND','LND','PDR'],ev.map(v=>[v[0],v[3],v[2],v[4],v[5],v[6],pct(v[7])]),[1850,4088,500,800,800,800,800],{size:16,numFrom:2,hl:i=>ev[i][0].startsWith('v8')}));
children.push(P('',{after:60}));
[['v1 → v3: ','Replacing HEED\'s iterative negotiation with a single-pass score (E/E0)·(1 + degree/maxDegree), recomputed only every 5 rounds, was the decisive change: LND +94% over v2 (1393 → 2703).'],
 ['v3 → v5: ','Stretching reuse to 15 rounds alone hurt every metric (PDR 97.72% → 94.67%), because a CH that dies mid-interval strands its cluster; a pre-designated backup CH (v5) recovered most of the PDR at zero messaging cost.'],
 ['v6 → v7.2: ','A CH-to-CH chain helped mainly when the sink is far; adding backup failover with chain repair (v7) raised PDR at both placements; a greedy multihop tree (v7.1) reached PDR 98.49%, and interval 10 (v7.2) traded PDR for LND.'],
 ['v5b: ','An "energy-aware repair" rule refused to promote or reconnect any node below 5% of E0. Late in the run every node is below that fixed 0.025 J, so nodes were left alive but silent: LND rose to 3203 while its last 1038 rounds delivered only 59 packets, and backups were rejected 20 times out of 20. A latent epoch bug also produced 998 rounds with zero CHs.']].forEach(([a,b])=>children.push(B([t(a,{b:true}),t(b)])));
children.push(img('fig/evolution.png',6.5));
children.push(cap('Figure 2 — FND/HND/LND of every center-BS version, in development order.'));

// ---- 7 Final protocol
children.push(H1('7. Final Protocol: v8-Chain'));
children.push(P('v8-Chain keeps the v3/v5 core (single-pass energy × connectivity election, 5-round reuse, backup CH with cluster repair) and adds the mechanisms below. Each can be switched off at compile time, which is how the ablation in Section 8 was produced.'));
const mech=[['I1 Epoch-exhaustion fix','Intervals with zero CHs when every alive node has already served in the epoch','Start a new epoch early'],
 ['I2 Proactive CH handover','A CH that dies mid-aggregation loses its whole cluster\'s packets for that round','Before the data phase, a CH that cannot afford this round\'s workload hands over to its strongest member (1 control packet)'],
 ['I3 Orphan re-join','Members of a dead CH without a usable backup stay unclustered','Join the nearest surviving CH (known from the setup advertisements)'],
 ['I4 Direct-to-BS','Nodes nearer the sink than their CH still relay through the CH','Send straight to the BS: equal or lower cost for the node, and the CH saves RX + aggregation'],
 ['I5 Energy-gated election','Weak nodes can be elected CH and die first','Only nodes at or above the average residual energy may volunteer'],
 ['Relative low-energy test','Fixed 5%·E0 rejected every late backup (0/20)','Compare with 5% of the live network average (18 successful promotions)'],
 ['Energy-aware CH relay','Direct CH→BS links are very expensive when the sink is far (d⁴ region)','A CH forwards to a CH closer to the BS only if Tx(CH→CH) + Rx + Agg < Tx(CH→BS); the path is rebuilt every round, so a replacement CH takes its predecessor\'s place']];
children.push(table(['Mechanism','Problem addressed','How it works'],mech,[2300,3400,3938],{size:16,hl:i=>i===6}));
children.push(img('fig/v8_chain_flowchart.png',4.3));
children.push(cap('Figure 3 — Operation of v8-Chain per round (grey: inherited; green: new in v8; orange: new in v8-Chain).'));
children.push(img('fig/v8_chain_topology.png',6.5));
children.push(cap('Figure 4 — Round 1 (seed 12345): with a central sink no CH relays and nearby members send directly; with a far sink the CHs form a relay chain on their own.'));

// ---- 8 Results
children.push(H1('8. Results'));
children.push(H2('8.1 Center versus far base station'));
const cf=[['v6 (ordered chain)','1551 / 1981 / 2106','97.49%','1266 / 1910 / 2031','97.08%'],['v7 (chain + backup + repair)','1551 / 1976 / 2066','98.43%','1266 / 1891 / 1976','98.14%'],['v8','2621 / 2711 / 2761','99.22%','1471 / 1646 / 1716','98.66%'],['v8-Chain','2621 / 2711 / 2756','99.27%','1716 / 1886 / 1956','99.07%']];
children.push(table(['Protocol','Center FND / HND / LND','Center PDR','Far FND / HND / LND','Far PDR'],cf,[2600,2150,1300,2288,1300],{size:17,numFrom:1,hl:i=>i===3}));
children.push(img('fig/center_far.png',6.3));
children.push(cap('Figure 5 — The same protocols with the BS at the center and far from the field.'));
children.push(P('At the center sink, v8-Chain never finds a relay cheaper than going direct, so it behaves exactly like v8 — and a forced ordered chain would cost it about 55 rounds of FND. At the far sink, CH-to-BS links of 100–200 m fall in the d⁴ multipath region; splitting them into short CH hops is cheaper, so the relay forms by itself (4,710 relays over the run) and adds about 245 rounds to v8\'s FND, HND and LND. Compared with v7, v8-Chain dies first 450 rounds later with higher PDR, while HND/LND stay within 1%.'));
children.push(H2('8.2 Which mechanism matters? (ablation, center BS)'));
children.push(table(['Variant','Mechanism removed','FND','HND','LND','PDR','Delivered'],D.ablation.map(a=>[a[0],a[1],a[2],a[3],a[4],pct(a[5]),a[6].toLocaleString('en-US')]),[1700,2638,850,850,850,1000,1750],{size:16,numFrom:2,hl:i=>i===0}));
children.push(P('',{after:60}));
children.push(P('Direct-to-BS delivery (I4) and the energy gate (I5) carry most of the lifetime gain; proactive handover (I2) mainly adds PDR by preventing packet loss when a CH dies mid-aggregation. I1 and I3 had no measurable effect once the other mechanisms were on (they are safety nets; I1 alone removes all 998 zero-CH rounds of v5b). Over the whole lifetime v8 delivered 268,610 packets against 201,505 for v5b — 33% more data for the same 50 J.'));
children.push(H2('8.3 Robustness across topologies'));
children.push(P('Across 8 random topologies (seeds 12345, 1, 7, 42, 99, 2024, 31337, 555) the mean results were: center BS — v8-Chain 2618 / 2720 / 2765 rounds, PDR 99.25% (v5b: 1688 / 2119 / 2374, 97.56%); far BS — 1743 / 1932 / 1995 rounds, PDR 99.05%. At the far BS, v8-Chain matched or exceeded v7\'s LND of 1976 in 6 of the 8 topologies.'));

// ---- 9 Discussion
children.push(H1('9. Discussion and Recommendations'));
children.push(table(['Deployment priority','Recommended configuration','Reason'],[
 ['Sink inside or near the field','v8-Chain (= v8 here)','Latest FND of all tested protocols; PDR 99.27%'],
 ['Sink far from the field','v8-Chain','Best far-BS FND and PDR; relay forms automatically; HND/LND equal to v7'],
 ['Maximum raw LND regardless of data delivered','Not recommended as a target','High LND can come from silent nodes (v5b) — check delivered packets'],
 ['Simplest implementation with good PDR','v7.1 multihop or v5-exp (interval 5)','No proactive or relay logic; PDR ≈ 98.3–98.5%']],[2900,2500,4238],{size:17,hl:i=>i<2}));
children.push(P('',{after:60}));
[['Architecture beats parameter tuning: ','the two largest gains came from changing how CHs are chosen (v3) and how CHs are protected and relieved (v8), not from tuning intervals or probabilities.'],
 ['Lifetime must be read together with delivery: ','a protocol can report a long LND while its surviving nodes send almost nothing; FND, PDR and total delivered packets expose this.'],
 ['Relaying should be a per-CH energy decision: ','a fixed chain helps only at a far sink and hurts at a central one; comparing the two costs every round adapts automatically.']].forEach(([a,b])=>children.push(B([t(a,{b:true}),t(b)])));

// ---- 10 Limitations
children.push(H1('10. Limitations and Future Work'));
['The study is simulation-based (100 nodes, analytical radio model in ns-3); no hardware or SDR testbed was used.',
 'Only two sink placements, one field size and 8 random topologies were evaluated.',
 'The direct-to-BS gain depends on the sink being inside or near the field.',
 'Failure scenarios were single CH deaths caused by energy depletion; simultaneous or malicious failures were not tested.',
 'Future work: validate v8-Chain on hardware; sweep sink positions, field sizes and node counts; compare the greedy relay rule with an optimal minimum-energy tree; and evaluate it together with the thesis\'s hybrid-cryptography layer under attack.'].forEach(s=>children.push(B(s)));

// ---- 11 Conclusion
children.push(H1('11. Conclusion'));
children.push(P('This work reproduced the main LEACH/HEED-family protocols in one fair environment, corrected two literature hybrids whose published algorithms could not work as written, and evolved an original hybrid protocol one mechanism at a time. The final design, v8-Chain, combines a single-pass energy × connectivity CH election with 5-round cluster reuse, protects cluster heads both before failure (proactive handover) and after it (backup failover with cluster repair), lets nodes near the sink bypass their CH, restricts the CH role to above-average-energy nodes, and relays between CHs only when that saves energy. It achieved the latest first-node death of all protocols tested at a central sink (FND 2621) with PDR 99.27%, above every protocol of comparable lifetime and, with the sink far away, improved on the chain-based v7 by 36% in FND and 0.93 pp in PDR at equal HND/LND — a single configuration that works well in both deployments.'));

// ---- References
children.push(H1('References'));
D.refs.forEach((r,i)=>children.push(P([t(`[${i+1}] `,{b:true,size:19}),t(r,{size:19})],{after:80})));

const doc=new Document({creator:'Rahma Khaled Oshba',title:'State-of-the-Art Report — v8-Chain',
 styles:{default:{document:{run:{font:'Arial',size:21}}},paragraphStyles:[
  {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial',size:30,bold:true,color:RED},paragraph:{outlineLevel:0}},
  {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:'Arial',size:24,bold:true,color:CH},paragraph:{outlineLevel:1}}]},
 numbering:{config:[{reference:'bul',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:260}}}}]}]},
 sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'State-of-the-Art Report · v8-Chain   ',font:'Arial',size:16,color:'888888'}),new TextRun({children:[PageNumber.CURRENT],font:'Arial',size:16,color:RED,bold:true})]})]})},
  children}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('SOTA_Report_v8-Chain.docx',b);console.log('ok')});

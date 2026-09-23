const L=require('./deck_lib.js');const {pres,C,FONT,net,frame,content,section,text,card,stat,table,lifeChart,pdrChart,img,arrowFlow}=L;
const D=require('./data.json');
const pct=v=>(v*100).toFixed(2)+'%';
function shot(slide,x,y,w,h,label){ // screenshot placeholder: right-click → Change Picture, or delete and paste the screenshot
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w,h,rectRadius:0.1,fill:{color:'FFFFFF'},line:{color:C.ROSE,width:1.5,dashType:'dash'}});
  slide.addText([{text:'📷',options:{fontSize:30,breakLine:true}},{text:label,options:{fontSize:13,bold:true,color:C.RED,breakLine:true}},{text:'(paste your VMware screenshot here)',options:{fontSize:11,italic:true,color:C.GREY}}],{x:x+0.2,y:y+0.2,w:w-0.4,h:h-0.4,align:'center',valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
}

// ===== 1 Title
{const s=pres.addSlide(); frame(s); net(s,10.1,0.22,1.05); net(s,0.3,7.28,0.6,C.RED,false,true); 
 s.addText('Energy-Efficient Secure Clustering in Wireless Sensor Networks Using Hybrid Cryptography',{x:0.9,y:1.55,w:9.4,h:1.9,fontSize:36,bold:true,color:C.RED,fontFace:FONT,margin:0,valign:'bottom',isTextBox:true});
 s.addText('A comparative simulation study: LEACH / HEED / PEGASIS family vs. the proposed hybrid protocol (v1 → v8-Chain)',{x:0.9,y:3.55,w:9.4,h:0.8,fontSize:17,italic:true,color:C.CH,fontFace:FONT,margin:0,valign:'top',isTextBox:true});
 s.addText([{text:'Presented by: ',options:{bold:true,color:C.RED}},{text:'Eng. Rahma Khaled Oshba',options:{bold:true,color:C.CH,breakLine:true}},
   {text:'Supervised by: ',options:{bold:true,color:C.RED}},{text:'Dr. Hesham ElZouka  ·  Dr. Amani Saad  ·  Dr. Khaled Saada',options:{color:C.CH,breakLine:true}},
   {text:'Master\'s Thesis Defense',options:{italic:true,color:C.GREY,fontSize:13}}],{x:2.2,y:4.75,w:9,h:1.5,fontSize:16,fontFace:FONT,margin:0,valign:'top',paraSpaceAfter:6,isTextBox:true});
 }
// numbering starts after title
// ===== 2 Agenda
{const s=content('Agenda',null,'Seven parts: background, related work, methodology, reproduction of existing protocols, the evolution of the proposed protocol, the final v8-Chain design, and the results.');
 const items=[['01','Background: WSNs & clustering'],['02','Related work & research gap'],['03','Methodology, ns-3 setup & first experiment'],['04','Reproducing existing protocols'],['05','Proposed protocol: v1 → v7.2'],['06','Final design: v8-Chain'],['07','Results, findings, conclusion & references']];
 items.forEach(([n,t],i)=>{const col=i<4?0:1,row=i<4?i:i-4; const x=0.9+col*5.9,y=1.6+row*1.2;
   s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y,w:5.5,h:0.95,rectRadius:0.12,fill:{color:C.WHITE},line:{color:C.LINE,width:1}});
   s.addText(n,{x:x+0.2,y,w:0.9,h:0.95,fontSize:26,bold:true,color:C.RED,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
   s.addText(t,{x:x+1.15,y,w:4.2,h:0.95,fontSize:16,color:C.CH,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});});}

// ===== SECTION 1
section('01','Background','Wireless sensor networks, clustering, and why energy decides everything');
{const s=content('Wireless Sensor Networks','Definition','Use the definition figure from the background presentation.');
 img(s,'img/bg_definition.png',0.7,1.45,7.4,5.2,1536,1024);
 text(s,[{h:'What is a WSN?'},'Many small, battery-powered sensor nodes sense the environment and send data wirelessly to a base station (sink).',
   {h:'Key constraints'},'Limited, usually non-rechargeable battery','Limited processing and memory','Radio communication is the main energy consumer'],{x:8.4,y:1.6,w:4.2,h:5.0,fontSize:14});}
{const s=content('WSN Components','Node, network & data flow');
 img(s,'img/bg_overview.png',0.7,1.4,7.6,5.3,1536,1024);
 card(s,8.6,1.55,4.0,1.55,'Sensor node','Sensing unit, processor, transceiver and a power unit (battery).',{size:14});
 card(s,8.6,3.25,4.0,1.55,'Base station (sink)','Collects the data and connects the network to users / the Internet.',{size:14});
 card(s,8.6,4.95,4.0,1.55,'Data flow','Node → cluster → sink → user, over single- or multi-hop links.',{size:14});}
{const s=content('Clustering in WSNs','Why cluster heads?','Clustering = dominant energy-saving architecture. The CH does the heavy work, so choosing and rotating CHs well is the core problem of this thesis.');
 const steps=[{h:'Members',t:'send short-range data to their CH'},{h:'Cluster Head (CH)',t:'receives, aggregates into one packet'},{h:'Base Station',t:'receives one packet per cluster'}];
 arrowFlow(s,steps,0.9,1.65,11.6,1.3,{hs:15,ts:12});
 card(s,0.9,3.35,3.7,3.1,'Benefits','• Fewer long-range transmissions\n• Data aggregation removes redundancy\n• Scales to many nodes',{tag:'✓',tagFill:C.GREEN});
 card(s,4.85,3.35,3.7,3.1,'The catch','• CHs spend far more energy (receive + aggregate + long transmission)\n• A badly chosen or over-used CH dies early',{tag:'!',tagFill:C.GOLD});
 card(s,8.8,3.35,3.7,3.1,'Therefore','CH selection, CH rotation and what happens when a CH fails decide the network lifetime.',{tag:'→'});}
{const s=content('Radio Energy Model','First-order, two-slope','d0 = sqrt(Efs/Emp) = 87.7 m. Beyond d0 cost grows with d^4 — this is why a far BS makes CH relaying worthwhile.');
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.9,y:1.6,w:6.4,h:2.6,rectRadius:0.12,fill:{color:C.WHITE},line:{color:C.LINE}});
 s.addText([{text:'Transmit k bits over distance d',options:{bold:true,color:C.RED,breakLine:true}},
   {text:'E_TX = E_elec·k + E_fs·k·d²        d < d0',options:{breakLine:true}},
   {text:'E_TX = E_elec·k + E_mp·k·d⁴        d ≥ d0',options:{breakLine:true}},
   {text:'E_RX = E_elec·k    E_DA per bit',options:{breakLine:true}},
   {text:'d0 = √(E_fs / E_mp) ≈ 87.7 m',options:{bold:true,color:C.RED}}],{x:1.15,y:1.75,w:6,h:2.35,fontSize:16,fontFace:'Courier New',color:C.CH,margin:0,valign:'top',paraSpaceAfter:8,isTextBox:true});
 table(s,['Parameter','Value'],[['E_elec','50 nJ/bit'],['E_fs','10 pJ/bit/m²'],['E_mp','0.0013 pJ/bit/m⁴'],['E_DA','5 nJ/bit'],['Packet / control','2000 / 200 bits']],{pos:{x:7.7,y:1.6,w:4.8,colW:[2.2,2.6]},center:1});
 card(s,0.9,4.5,11.6,1.85,'What this means','Short distances are cheap; long ones are very expensive (d² then d⁴). Every protocol in this study tries to (1) keep member→CH links short, (2) send as few long-range packets as possible, and (3) spread the expensive CH role fairly.',{size:14});}
{const s=content('Research Problem & Objectives',null,'');
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.9,y:1.55,w:11.6,h:1.35,rectRadius:0.12,fill:{color:C.RED},line:{color:C.RED}});
 s.addText('How can CH selection, cluster maintenance and inter-cluster routing be designed together so that a WSN lives longer and delivers more data — without heavy control overhead?',{x:1.2,y:1.6,w:11,h:1.25,fontSize:18,bold:true,color:C.WHITE,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
 const obj=[['1','Reproduce fairly','Rebuild LEACH, HEED, PEGASIS and two LEACH+HEED hybrids in one unified ns-3 environment.'],['2','Diagnose','Find why each protocol wins or loses — including flaws in the published algorithms.'],['3','Design','Evolve an original hybrid protocol one mechanism at a time (v1 → v8-Chain).'],['4','Validate','Measure FND, HND, LND, PDR at two BS placements and 8 random topologies.']];
 obj.forEach(([n,h,b],i)=>card(s,0.9+i*2.97,3.2,2.75,3.25,h,b,{tag:n,size:14.5}));}

// ===== SECTION 2
section('02','Related Work','LEACH · HEED · PEGASIS · literature hybrids · recent work');
{const s=content('LEACH vs. HEED','Two foundations','LEACH is simple and cheap but blind to energy; HEED picks better CHs but pays an iterative negotiation every round.');
 table(s,['','LEACH (2000)','HEED (2004)'],[['Main idea','Probabilistic CH rotation','Energy + communication-cost CH selection'],['CH selection','Random, threshold T(n)','Iterative, probability ∝ residual energy'],['Energy awareness','✗ none','✓ residual energy'],['Overhead','Low','High (several rounds of messages)'],['Strength','Simple, balanced rotation','Better-informed CHs, high PDR'],['Weakness','Weak CHs may be elected','Overhead shortens lifetime']],{pos:{x:0.9,y:1.6,w:7.3,colW:[1.9,2.5,2.9]},center:9,boldFirst:true});
 card(s,8.55,1.6,3.95,4.75,'Key insight','Combine LEACH\'s lightweight rotation with HEED\'s energy- and connectivity-aware CH quality — without HEED\'s per-round negotiation cost.\n\nThis is the starting point (v1) of the proposed protocol.',{size:14,fill:C.PINK,border:C.ROSE});}
{const s=content('Cluster-based vs. Chain-based','LEACH & PEGASIS');
 img(s,'img/bg_leach_pegasis.png',0.7,1.4,7.4,5.3,1536,1024);
 card(s,8.4,1.55,4.2,2.35,'PEGASIS (2002)','Greedy chain through all nodes; one leader per round sends to the BS. Very long lifetime, but long delay and one chain = single point of failure.',{size:14});
 card(s,8.4,4.1,4.2,2.35,'Relevance to this work','The chain idea inspired the CH-to-CH relay (v6/v7) and, finally, the energy-aware relay of v8-Chain — used only when it saves energy.',{size:14,fill:C.PINK,border:C.ROSE});}
{const s=content('Literature Hybrids','SH-LEACH & H-LEACH');
 card(s,0.9,1.6,5.65,3.4,'SH-LEACH (2015)','• LEACH + HEED-style probability doubling\n• Targets a later first node death\n\nFlaw found: the formula applies ONE doubling instead of HEED\'s iterative doubling.',{size:15});
 card(s,6.85,1.6,5.65,3.4,'H-LEACH (2016)','• Energy-gated election: only nodes with energy > average may become CH\n\nFlaw found: with equal initial energy no node is strictly above average → no CH is ever elected (deadlock).',{size:15});
 card(s,0.9,5.25,11.6,1.2,'What they show','Fusing LEACH and HEED helps CH selection — but neither handles cluster reuse, CH failure or inter-cluster relaying.',{size:15,fill:C.PINK,border:C.ROSE});}
{const s=content('Recent Related Work','2024 – 2026');
 table(s,['Paper','Protocol','Main idea','Gap w.r.t. this work'],[
  ['Kaur et al., 2025','EECH-HEED','HEED + EECH zones + adaptive threshold sensing','Not LEACH+HEED; no reuse or failure recovery'],
  ['Juwaied & Jackowska-Strumillo, 2025','DL-HEED','Graph neural network replaces HEED\'s CH formula','Training/inference cost; no reuse or relay'],
  ['Subedi et al., 2024','TLC-LEACH','Two-level grid clustering, angular boundary fix','No failure recovery; no energy × connectivity score'],
  ['El-Sayed et al., 2026','RL-ILEACH','Q-learning inside ILEACH CH selection','PDR gain not significant; no relay'],
  ['Razaque 2016 / Shrestha 2015','H-LEACH / SH-LEACH','Direct LEACH + HEED fusion','No reuse, failover or relay — the gap targeted here']],{pos:{x:0.9,y:1.6,w:11.6,colW:[2.6,1.8,3.7,3.5]},center:9,hl:i=>i===4,rowH:0.85});}
{const s=content('Related Mechanisms','What exists vs. what is new','Each mechanism of v8-Chain exists somewhere on its own; the contribution is combining them, making relaying an energy decision, and evaluating them one at a time.');
 table(s,['Mechanism in v8-Chain','Where it already appears','What this thesis adds'],[
  ['LEACH + HEED fusion','H-LEACH [5], SH-LEACH [4]','Single-pass score + reuse; fixes to both papers'],
  ['Backup cluster head','FTEC [10] (HEED + backup CH)','Backup + cluster repair with a live-average energy test'],
  ['CH hand-over before depletion','Threshold-based CH rotation (review [11])','Proactive hand-over per round, cost-based trigger'],
  ['Inter-cluster multi-hop','EEUC [12], EAUCA [13]','Relay only when cheaper than direct — adapts to BS position'],
  ['Two-slope radio model','Heinzelman et al. 2002 [14]','Same model for every protocol (fair comparison)']],{pos:{x:0.9,y:1.6,w:11.6,colW:[3.2,3.8,4.6]},center:9,boldFirst:true,rowH:0.6,fs:13});
 card(s,0.9,5.8,11.6,0.7,'No reviewed work combines all four pillars — the novelty is the integration and its controlled, step-by-step evaluation.',null,{headSize:14,headColor:C.CH});}
{const s=content('Research Gap','What is still missing','Four pillars. None of the reviewed works combines all four.');
 const p=[['1','Energy-aware CH selection','Energy × connectivity score'],['2','Multi-round cluster reuse','Less setup overhead'],['3','CH failure recovery','Backup CH + repair (and prevention)'],['4','Adaptive inter-cluster relay','CH-to-CH only when it saves energy']];
 p.forEach(([n,h,b],i)=>{card(s,0.9+i*2.97,1.7,2.75,2.6,h,b,{tag:n,size:16});});
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.9,y:4.75,w:11.6,h:1.6,rectRadius:0.12,fill:{color:C.RED},line:{color:C.RED}});
 s.addText([{text:'Our direction: ',options:{bold:true}},{text:'one integrated hybrid clustering & routing protocol that combines all four pillars — evaluated step by step against the reproduced baselines.'}],{x:1.2,y:4.8,w:11,h:1.5,fontSize:17,color:C.WHITE,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});}

// ===== SECTION 3
section('03','Methodology','Reproduce → unify → modify → design → test');
{const s=content('Research Workflow',null,'Every published protocol was first reproduced in its own paper\'s settings (to validate our code), then moved to the unified environment (to compare fairly).');
 arrowFlow(s,[{h:'1',t:'Literature review'},{h:'2',t:'Protocol reconstruction'},{h:'3',t:'Unified environment'},{h:'4',t:'Targeted fixes'},{h:'5',t:'Proposed protocol'},{h:'6',t:'Controlled experiments'},{h:'7',t:'Analysis'}],0.9,1.75,11.6,1.55,{hs:22,ts:12.5,gap:0.3});
 card(s,0.9,3.7,5.65,2.7,'Two-step reproduction','Step 1 — paper-exact: our code with each paper\'s own field, radio, BS and packet size → validates the implementation.\nStep 2 — unified: the same code in one common environment → protocols become directly comparable.',{size:15});
 card(s,6.85,3.7,5.65,2.7,'One change per version','The proposed protocol was developed version by version, changing ONE mechanism each time, so every gain or loss can be attributed to its cause.',{size:15});}
// ===== Work environment & first experiment (start of the experiments, inside Methodology)
{const s=content('Tools & Setup','Where the experiments start',"All experiments run inside a VMware Workstation 17 virtual machine with Ubuntu Linux (6 GB RAM, 6 CPU cores, 40 GB disk, NAT network, snapshot 'clean + NS3'). ns-3.41 is the simulator; NetAnim replays the network; Python and Excel are used for analysis.");
 arrowFlow(s,[{h:'VMware',t:'virtual machine'},{h:'Ubuntu Linux',t:'operating system'},{h:'ns-3.41',t:'C++ network simulator'},{h:'NetAnim',t:'network animation'},{h:'Python / Excel',t:'charts & comparison'}],0.9,1.5,11.6,0.95,{hs:15,ts:11.5});
 img(s,'img/vm_settings.png',0.9,2.7,5.65,3.3,1920,1007);
 img(s,'img/vm_ubuntu.png',6.85,2.7,5.65,3.3,1912,1002);
 s.addText('VMware VM: 6 GB RAM · 6 cores · 40 GB · snapshot “clean + NS3”',{x:0.9,y:6.05,w:5.65,h:0.35,fontSize:11.5,italic:true,color:C.GREY,align:'center',fontFace:FONT,margin:0,isTextBox:true});
 s.addText('Ubuntu desktop running inside the VM',{x:6.85,y:6.05,w:5.65,h:0.35,fontSize:11.5,italic:true,color:C.GREY,align:'center',fontFace:FONT,margin:0,isTextBox:true});}
{const s=content('First Experiment','A simple network to confirm the idea','The very first test (scratch/wsn-first-packet.cc): 4 nodes with the full IEEE 802.15.4 stack — real PHY and MAC — so we see a packet actually travel from a sensor to the sink before building clustering on top.');
 img(s,'img/first_netanim.png',0.9,1.5,6.1,3.9,1352,827);
 s.addText('NetAnim view of the first network: nodes 0, 1, 2 = sensors · node 3 = sink',{x:0.9,y:5.45,w:6.1,h:0.35,fontSize:11.5,italic:true,color:C.GREY,align:'center',fontFace:FONT,margin:0,isTextBox:true});
 table(s,['Setting','Value'],[['Nodes','3 sensors + 1 sink (MAC 00:01–00:04)'],['Placement','Random in a 20 × 20 m box'],['Stack','IEEE 802.15.4 LR-WPAN PHY + MAC, ACK on'],['Channel','Log-distance loss, constant-speed delay'],['Traffic','50 B every 10 s per sensor, 1000 s'],['Energy','100 J battery, 3.3 V · TX 17 mA · RX 19 mA']],{pos:{x:7.3,y:1.5,w:5.2,colW:[1.5,3.7]},center:9,boldFirst:true,rowH:0.62,fs:12});}
{const s=content('First Experiment','Running it in ns-3','Build and run from the ns-3 folder; the program writes wsn-first-packet.xml, which NetAnim opens.');
 img(s,'img/first_terminal.png',0.9,1.45,5.9,4.6,1146,885);
 img(s,'img/netanim_cmd.png',0.9,6.1,5.9,0.52,836,72);
 card(s,7.1,1.5,5.4,2.2,'Commands','cd ~/ns-allinone-3.41/ns-3.41\n./ns3 run scratch/wsn-first-packet\ncd ../netanim-3.109 && ./NetAnim',{size:13.5});
 card(s,7.1,3.95,5.4,2.6,'What the terminal shows','• 4 node positions + colours for NetAnim\n• Each packet: 1 TX and 3 RX events — the channel is shared, so every node hears every frame\n• “No ipv4 object found” is normal: 802.15.4 here runs without IP',{size:13});}
{const s=content('First Experiment','Results','Every sensor sent 100 packets; the sink received all 300.');
 table(s,['Metric','Result'],D.phy,{pos:{x:0.9,y:1.5,w:6.6,colW:[2.9,3.7]},center:9,boldFirst:true,rowH:0.55,fs:13});
 stat(s,8.0,1.6,4.5,'300 / 300','packets delivered — PDR 100 %');
 stat(s,8.0,3.1,4.5,'120 bit/s','throughput (15 000 bytes in 1000 s)');
 stat(s,8.0,4.6,4.5,'62.64 J','consumed by EVERY node — sensors and sink alike');}
{const s=content('Lesson from the First Experiment','Energy','All four nodes spent the same 62.6 J although the sink received 300 packets and each sensor only sent 100. The radio stays in RX (listening) all the time, so the energy is set by listening time, not by traffic.');
 card(s,0.9,1.5,5.65,2.35,'Why every node used 62.64 J','Radio always in RX mode (listening):\n3.3 V × 19 mA × 999 s ≈ 62.64 J\nActual transmitting: ≈ 2 ms per packet → about 0.2 s in the whole run.',{size:14});
 card(s,6.85,1.5,5.65,2.35,'Consequence','At this rate every battery (100 J) empties after ≈ 1 600 s (≈ 27 min), even with no data at all. Idle listening, not sending, kills the node.',{size:14,fill:C.PINK,border:C.ROSE});
 card(s,0.9,4.1,11.6,2.4,'How this shaped the thesis','• Nodes must sleep outside their turn → clustering with a TDMA schedule: members wake only in their slot, the CH listens for its cluster.\n• The 100-node study therefore uses the first-order radio model, which charges energy per transmitted / received bit (it assumes sleeping outside the slot).\n• The small experiment confirmed the delivery chain (sensor → MAC → channel → sink) and the energy tracking before scaling up.',{size:14});}
{const s=content('Running the Protocols','ns-3 terminal','Real output of the simulator for the center-BS run. The same command with scratch/hybrid-v8-chain-farBS runs the far-BS case. Each run also writes three CSV files and a NetAnim XML animation.');
 img(s,'img/terminal_center.png',5.7,1.35,6.9,5.35,1180,1040);
 card(s,0.9,1.55,4.5,2.3,'How it is run','./ns3 run scratch/hybrid-v8-chain\n./ns3 run scratch/hybrid-v8-chain-farBS\n(one .cc file per protocol in scratch/)',{size:14});
 card(s,0.9,4.05,4.5,2.4,'What it produces','• Per-round results CSV (alive, CHs, PDR, energy…)\n• Per-node energy & lifetime CSVs\n• NetAnim XML — CHs in red, clusters coloured',{size:13.5});}
{const s=content('NetAnim','The proposed protocol animated','Open hybrid-v8-chain-clustering.xml in NetAnim and take a screenshot mid-run: cluster heads are red, each cluster has its own colour, dead nodes are grey.');
 shot(s,0.9,1.55,8.0,4.9,'Screenshot — NetAnim: v8-Chain clusters (CHs in red)');
 card(s,9.2,1.55,3.3,4.9,'Colours in NetAnim','• Red: cluster head\n• Same colour: same cluster\n• Light grey: no cluster\n• Dark grey: dead node\n• Yellow: sink (BS)',{size:13.5});}
{const s=content('Unified Simulation Environment',null,'All results in the comparison use exactly these settings.');
 table(s,['Parameter','Value'],D.env.slice(0,8).concat([D.env[12],D.env[13],D.env[14]]),{pos:{x:0.9,y:1.55,w:7.2,colW:[2.6,4.6]},center:9,boldFirst:true});
 stat(s,8.7,1.7,3.8,'100','sensor nodes in a 100 × 100 m field');
 stat(s,8.7,3.2,3.8,'0.5 J','initial energy per node');
 stat(s,8.7,4.7,3.8,'2','BS positions: center (50,50) and far (50, −100)');}
{const s=content('Performance Metrics',null,'FND is the most important metric for coverage: the moment a node dies, a part of the field is no longer monitored.');
 const m=[['FND','First Node Dead','Round when the first node dies — load balance & coverage stability.'],['HND','Half Nodes Dead','Round when 50% of nodes are dead — useful network lifetime.'],['LND','Last Node Dead','Round when the last node dies — total lifetime (can be inflated by silent nodes).'],['PDR','Packet Delivery Ratio','Delivered ÷ generated packets over the whole lifetime — reliability.']];
 m.forEach(([a,b,c],i)=>{const x=0.9+i*2.97; s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x,y:1.65,w:2.75,h:3.6,rectRadius:0.12,fill:{color:C.WHITE},line:{color:C.LINE}});
  s.addText(a,{x,y:1.8,w:2.75,h:0.9,fontSize:38,bold:true,color:C.RED,align:'center',fontFace:FONT,margin:0,isTextBox:true});
  s.addText(b,{x:x+0.15,y:2.75,w:2.45,h:0.5,fontSize:14,bold:true,color:C.CH,align:'center',fontFace:FONT,margin:0,isTextBox:true});
  s.addText(c,{x:x+0.2,y:3.3,w:2.35,h:1.8,fontSize:14,color:C.CH,align:'center',valign:'top',fontFace:FONT,margin:0,isTextBox:true});});
 card(s,0.9,5.5,11.6,0.95,'Also reported: total delivered packets — it exposes "alive but silent" nodes that make LND look better than the network really is.',null,{headSize:13.5,headColor:C.CH});}
// ===== SECTION 4
section('04','Reproducing Existing Protocols','Published → paper-exact → unified → improved');
{const s=content('Published vs. Our Reproduction','Step 1: paper-exact','Paper numbers cannot be compared with each other directly — every paper used different settings.');
 const rows=D.paperExact.map(p=>{const pb=D.published.find(x=>x[0]===p[0]);return [p[0],pb[3]?(p[0]==='H-LEACH'?'≈'+pb[3]:pb[3]):'graph only',p[1],p[2],p[3],pct(p[4])];});
 table(s,['Protocol','Published LND','Our FND','Our HND','Our LND','Our PDR'],rows,{pos:{x:0.9,y:1.6,w:7.6,colW:[1.7,1.5,1.1,1.1,1.1,1.1]},boldFirst:true});
 card(s,8.85,1.6,3.65,4.8,'Findings','• PEGASIS matched its paper within 2.3%.\n• LEACH matches the paper\'s own Fig. 3.\n• H-LEACH needed a fallback just to run (its gate deadlocks).\n• EECH-HEED is lower than published because its adaptive sensing was not yet implemented.',{size:14.5});}
{const s=content('Unified Environment','Step 2: same field, radio and BS','Now every protocol runs in the same environment, so differences come from the algorithms.');
 const u=D.unified.filter(r=>r[2]==='Edited'||r[2]==='Edited + variant');
 table(s,['Protocol','FND','HND','LND','PDR'],u.map(r=>[r[1],r[3],r[4],r[5],pct(r[6])]),{pos:{x:0.9,y:1.55,w:5.4,colW:[1.9,0.85,0.85,0.85,0.95]},boldFirst:true});
 lifeChart(s,u.map(r=>r[1].replace(' (fairness)','*')),u.map(r=>r[3]),u.map(r=>r[4]),u.map(r=>r[5]),{x:6.5,y:1.45,w:6.1,h:5.1});}
{const s=content('Why the Numbers Change','Paper-exact vs. unified LND');
 s.addChart(pres.charts.BAR,[{name:'Paper-exact',labels:['LEACH','HEED','PEGASIS','H-LEACH','SH-LEACH'],values:[1321,1996,2167,1210,884]},{name:'Unified',labels:['LEACH','HEED','PEGASIS','H-LEACH','SH-LEACH'],values:[1962,1362,2887,2305,1604]}],
   Object.assign({},{barDir:'col',barGrouping:'clustered',chartColors:['9E9E9E',C.RED],showValue:true,dataLabelFontSize:9,dataLabelPosition:'outEnd',catAxisLabelFontFace:FONT,valAxisLabelFontFace:FONT,legendPos:'t',showLegend:true,legendFontFace:FONT,valGridLine:{color:'E3E0D6',size:0.75},catGridLine:{style:'none'},plotArea:{fill:{color:C.CREAM}},chartArea:{fill:{color:C.CREAM}}},{x:0.8,y:1.45,w:7.2,h:5.1}));
 card(s,8.3,1.6,4.2,4.8,'Main causes','• Field size (50×50 → 100×100 m)\n• BS position (far → center)\n• Radio model (single-term → two-slope)\n• Packet size and initial energy (HEED: 2 J → 0.5 J)\n\nThe algorithm is identical in both bars — only the environment changed.',{size:14.5});}
{const s=content('Improving the Literature Hybrids','Targeted fixes');
 table(s,['Protocol','Stage','FND','HND','LND','PDR'],[['SH-LEACH','Edited',1440,1584,1604,'99.17%'],['SH-LEACH','Improved',1247,1600,1649,'99.79%'],['H-LEACH','Edited',2177,2255,2305,'97.33%'],['H-LEACH','Improved',2347,2449,2499,'97.33%']],{pos:{x:0.9,y:1.6,w:6.6,colW:[1.5,1.3,0.95,0.95,0.95,0.95]},hl:i=>i%2===1,boldFirst:true});
 card(s,7.8,1.6,4.7,2.25,'SH-LEACH fix','True iterative HEED doubling + Cprob 0.10 → 0.03: HND/LND/PDR up, FND −13% (fewer, larger clusters).',{size:14});
 card(s,7.8,4.05,4.7,2.35,'H-LEACH fix','Energy gate relaxed from 1.0× to 0.8× the average: the energy-weighted rule finally decides → FND/HND/LND +7.8–8.6%, no PDR cost.',{size:14});
 card(s,0.9,4.05,6.6,2.35,'Context: EECH-HEED','Adding its adaptive threshold sensing gives the longest raw lifetime (LND 3808) — because nodes transmit less often, not because of better clustering. Kept as context, not as a direct peer.',{size:14});}
{const s=content('Lessons Carried Forward',null,'Each lesson became a mechanism in the proposed protocol.');
 const l=[['CH selection','Better CH choice alone is not enough.'],['Control overhead','Re-clustering every round wastes energy.'],['Cluster reuse','Longer reuse saves energy but risks stale clusters.'],['CH failure','A dead CH strands its whole cluster.'],['Inter-cluster routing','Direct CH → BS is costly when the BS is far.']];
 l.forEach(([h,b],i)=>card(s,0.9+i*2.35,1.8,2.15,3.2,h,b,{tag:String(i+1),size:15,headSize:14}));
 s.addText('→ These observations drove every version of the proposed protocol.',{x:0.9,y:5.4,w:11.6,h:0.6,fontSize:17,bold:true,color:C.RED,fontFace:FONT,margin:0,isTextBox:true});}

// ===== SECTION 5
section('05','Proposed Protocol: v1 → v7.2','One mechanism per version, measured every time');
{const s=content('Evolution Roadmap',null,'');
 const v=[['v1','HEED CH + LEACH join'],['v2','Rotation fairness'],['v3','Single-pass score + reuse'],['v4','Interval 15'],['v5','Backup CH'],['v6','CH-to-CH chain'],['v7','Chain + repair'],['v7.1/2','Multihop'],['v8','Proactive + direct'],['v8-Chain','Energy-aware relay']];
 const x0=1.55,w=10.25,step=w/(v.length-1);
 s.addShape(pres.shapes.LINE,{x:x0,y:3.55,w,h:0,line:{color:C.RED,width:3}});
 v.forEach(([a,b],i)=>{const x=x0+i*step; const fin=i>=8;
   s.addShape(pres.shapes.OVAL,{x:x-0.22,y:3.33,w:0.44,h:0.44,fill:{color:fin?C.RED:C.WHITE},line:{color:C.RED,width:2}});
   const up=i%2===0;
   s.addText(a,{x:x-0.7,y:up?2.35:3.95,w:1.4,h:0.45,fontSize:15,bold:true,color:C.RED,align:'center',fontFace:FONT,margin:0,isTextBox:true});
   s.addText(b,{x:x-0.75,y:up?1.75:4.4,w:1.5,h:0.6,fontSize:11,color:C.CH,align:'center',valign:up?'bottom':'top',fontFace:FONT,margin:0,isTextBox:true});});
 card(s,0.9,5.35,11.6,1.05,'Selection  →  reuse  →  recovery  →  relay  →  prevention + adaptive relay',null,{headSize:15,headColor:C.CH});}
{const s=content('v1 → v2','Hybrid foundation','v1 combined HEED CH selection with LEACH joining; v2 added a rotation-fairness penalty. Both kept HEED\'s per-round negotiation — so lifetime stayed short.');
 arrowFlow(s,[{h:'Residual energy'},{h:'HEED-style CH selection'},{h:'LEACH nearest-CH join'},{h:'CH → BS'}],0.9,1.65,11.6,0.95,{hs:14});
 table(s,['Version','Idea','FND','HND','LND','PDR'],[['v1','HEED-style CH selection + LEACH clustering',330,557,1318,'99.74%'],['v2','+ rotation-fairness penalty (λ = 0.1)',345,534,1393,'99.79%']],{pos:{x:0.9,y:3.0,w:11.6,colW:[1.2,5.6,1.2,1.2,1.2,1.2]},center:2,boldFirst:true});
 card(s,0.9,4.4,11.6,2.0,'Diagnosis','High PDR but very early first death: the iterative HEED negotiation is paid in full EVERY round, whether or not the topology changed. The overhead — not the CH quality — was the root cause.',{size:14,fill:C.PINK,border:C.ROSE});}
{const s=content('v3','Root-cause redesign','The decisive step. The score keeps HEED\'s intelligence but in one shot, and clusters are reused for 5 rounds.');
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.9,y:1.6,w:7.2,h:1.5,rectRadius:0.12,fill:{color:C.WHITE},line:{color:C.LINE}});
 s.addText([{text:'score = (E / E0) × (1 + degree / maxDegree)',options:{breakLine:true}},{text:'P(CH) = min(1, T(r) × score)',options:{}}],{x:1.1,y:1.65,w:6.9,h:1.4,fontSize:18,fontFace:'Courier New',bold:true,color:C.RED,valign:'middle',margin:0,paraSpaceAfter:6,isTextBox:true});
 text(s,['Single pass — no iterative negotiation','CHs recomputed only once every 5 rounds (setup interval)','LEACH threshold T(r) and epoch keep the rotation fair'],{x:0.9,y:3.35,w:7.2,h:2.2,fontSize:15});
 stat(s,8.7,1.6,3.8,'+94%','LND vs v2 (1393 → 2703)',{size:48});
 stat(s,8.7,3.3,3.8,'×5','later first node death (345 → 1730)',{size:48});
 table(s,['FND','HND','LND','PDR'],[[1730,2081,2703,'97.72%']],{pos:{x:0.9,y:5.55,w:7.2},center:0});}
{const s=content('v4 & v5','Reuse interval and backup CH');
 table(s,['Version','Change','FND','HND','LND','PDR'],[['v3','Interval 5',1730,2081,2703,'97.72%'],['v4','Interval 5 → 15',1513,2219,2521,'94.67%'],['v5','+ Backup CH failover',1513,2127,2416,'97.05%'],['v5-exp','Interval 5 + backup + cluster repair',1730,2086,2156,'98.27%'],['v5-exp','Interval 10 + backup + cluster repair',1621,2141,2291,'97.94%']],{pos:{x:0.9,y:1.6,w:7.4,colW:[1.0,3.0,0.85,0.85,0.85,0.85]},center:2,boldFirst:true});
 card(s,8.6,1.6,3.9,2.3,'v4: longer reuse hurts','A CH that dies mid-interval strands its cluster for longer → PDR 97.72% → 94.67%.',{size:14});
 card(s,8.6,4.1,3.9,2.3,'v5: backup CH','The highest-energy member is pre-designated at setup (zero extra messages) and promoted when the CH dies → PDR back to 97%+.',{size:14});}
{const s=content('v6 & v7','CH-to-CH chain + repair','Chain: CHs sorted by distance to BS, the closest is the gateway. v7 lets the promoted backup take the dead CH\'s place in the chain.');
 arrowFlow(s,[{h:'CH₁'},{h:'CH₂'},{h:'CH₃'},{h:'Gateway CH'},{h:'BS',fill:C.RED,hc:C.WHITE,border:C.RED}],0.9,1.6,7.2,0.8,{hs:15,gap:0.35});
 table(s,['Version','BS','FND','HND','LND','PDR'],[['v6','Center',1551,1981,2106,'97.49%'],['v7','Center',1551,1976,2066,'98.43%'],['v6','Far',1266,1910,2031,'97.08%'],['v7','Far',1266,1891,1976,'98.14%']],{pos:{x:0.9,y:2.75,w:7.2,colW:[1.2,1.2,1.2,1.2,1.2,1.2]},center:1,boldFirst:true});
 card(s,8.45,1.6,4.05,2.3,'Backup + chain repair','Recovery validated: 16/16 repairs (center) and 21/21 (far BS) via backup promotion.',{size:14});
 card(s,8.45,4.1,4.05,2.3,'Observation','The chain raises PDR, but an always-on chain adds relay cost when the BS is near. A fixed topology is not ideal everywhere.',{size:14,fill:C.PINK,border:C.ROSE});}
{const s=content('v7.1 & v7.2','Multihop routing tree','Each CH forwards to the nearest CH strictly closer to the BS: no single gateway.');
 table(s,['Metric','v7.1 (interval 5)','v7.2 (interval 10)'],[['FND',1491,1381],['HND',1991,2071],['LND',2086,2241],['PDR','98.49%','97.88%']],{pos:{x:0.9,y:1.6,w:6.0,colW:[1.6,2.2,2.2]},boldFirst:true,rowH:0.7,fs:16});
 card(s,7.2,1.6,5.3,2.2,'Multihop tree','Removes the single-gateway bottleneck → highest PDR of v1–v7 (98.49%), at a small FND cost.',{size:14.5});
 card(s,7.2,4.0,5.3,2.4,'Interval again','Interval 10 gives more LND but less PDR — confirming that setup frequency is a separate lever from selection or topology.',{size:14.5});}
{const s=content('v1 → v7.2 at a Glance','Center BS');
 const ev=D.proposed.filter(v=>v[1]==='Center'&&!v[0].startsWith('v8')&&!v[0].startsWith('v5b'));
 lifeChart(s,ev.map(v=>v[0].replace(' Multihop','').replace('(Int ','(')),ev.map(v=>v[4]),ev.map(v=>v[5]),ev.map(v=>v[6]),{x:0.7,y:1.35,w:11.9,h:5.3});}
{const s=content('Where v1–v7.2 Stood',null,'None of v3–v7.2 beat v3 on LND while also keeping PDR high: there was room for a better design.');
 const ev=D.proposed.filter(v=>v[1]==='Center'&&!v[0].startsWith('v8')&&!v[0].startsWith('v5b'));
 pdrChart(s,ev.map(v=>v[0].replace(' Multihop','').replace('(Int ','(')),ev.map(v=>+(v[7]*100).toFixed(2)),{x:0.7,y:1.35,w:7.6,h:5.3},{min:94,title:'PDR (%)'});
 card(s,8.6,1.6,3.9,4.8,'Trade-offs so far','• v3: best LND, lower PDR\n• v1/v2: best PDR, very short life\n• v7 / v7.1: best balance, but FND ≤ 1551\n\nGoal for the final design: later first death AND higher PDR at the same time.',{size:14.5});}

// ===== SECTION 6
section('06','Final Design: v8-Chain','Prevent CH death, relieve the CHs, relay only when it pays');
{const s=content('What We Found in v5b','Energy-Aware Repair','v5b refused to use any node below 5% of E0 (0.025 J). Late in the run every node is below that, so nodes stayed alive but silent.');
 stat(s,0.9,1.6,3.6,'3203','LND of v5b — looks like the best…',{size:44});
 stat(s,4.9,1.6,3.6,'59','packets delivered in its last 1038 rounds',{size:44});
 stat(s,8.9,1.6,3.6,'0 / 20','backup promotions succeeded',{size:44});
 card(s,0.9,3.6,5.65,2.8,'Problem 1: silent survivors','The fixed threshold left weak members unclustered: they stopped sending, so they did not die → an inflated LND with almost no data delivered.',{size:14.5});
 card(s,6.85,3.6,5.65,2.8,'Problem 2: zero-CH rounds','When every alive node had already been CH in the epoch, nobody was eligible: 998 rounds ran with NO cluster head (e.g., rounds 196–200 with all 100 nodes alive).',{size:14.5});}
{const s=content('v8 Mechanisms',null,'I1–I5 can each be switched off at compile time — that is how the ablation was measured.');
 const m=[['I1','Epoch-exhaustion fix','New epoch starts when nobody is eligible → never zero CHs.'],['I2','Proactive CH handover','A CH that cannot afford this round hands over to its strongest member BEFORE dying.'],['I3','Orphan re-join','Members of a dead CH join the nearest surviving CH.'],['I4','Direct-to-BS','A node closer to the BS than to its CH sends directly.'],['I5','Energy-gated election','Only nodes with ≥ average energy may become CH.'],['fix','Relative low-energy test','5% of the live average, not of E0 → backup works again.']];
 m.forEach(([t,h,b],i)=>{const col=i%3,row=Math.floor(i/3); card(s,0.9+col*3.93,1.6+row*2.45,3.7,2.25,h,b,{tag:t,tagSize:t.length>2?10:13,size:14,headSize:14});});}
{const s=content('Protecting the Cluster Head','Before and after failure','Two lines of defence. v5 only had the second one.');
 card(s,0.9,1.6,5.65,3.3,'Prevention (new, I2)','Before the data phase the CH compares its energy with this round\'s workload:\nmembers × (Rx + Agg) + Tx to next hop.\nIf it cannot finish, it hands the role to its strongest member while still alive — no packets lost.',{size:14.5,tag:'1'});
 card(s,6.85,1.6,5.65,3.3,'Repair (v5, fixed)','If a CH still dies unexpectedly, the backup is promoted and members are reconnected in the same round. The relative threshold made this work late in the run.',{size:14.5,tag:'2'});
 stat(s,1.3,5.2,4.8,'26','proactive handovers (center BS)',{size:40});
 stat(s,7.25,5.2,4.8,'18 / 11','backup promotions succeeded / rejected',{size:40});}
{const s=content('v8-Chain: Energy-Aware Relay','Relay only when it pays','This single rule makes the protocol adapt to the BS position with no parameter.');
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:0.9,y:1.6,w:11.6,h:1.3,rectRadius:0.12,fill:{color:C.WHITE},line:{color:C.LINE}});
 s.addText('relay via CHj  if   Tx(CH → CHj) + Rx + Agg at CHj  <  Tx(CH → BS)',{x:1.1,y:1.6,w:11.2,h:1.3,fontSize:20,bold:true,fontFace:'Courier New',color:C.RED,align:'center',valign:'middle',margin:0,isTextBox:true});
 card(s,0.9,3.2,5.65,3.2,'BS at the center','Every CH is ≤ ~50 m from the BS (d² region). A relay never saves energy → 0 relays → identical to v8.',{size:15,tag:'C'});
 card(s,6.85,3.2,5.65,3.2,'BS far away (50, −100)','CH → BS links are 100–200 m (d⁴ region). Short CH hops are much cheaper → the CHs form a chain on their own (4,710 relays). The path is rebuilt every round, so a replacement CH takes its predecessor\'s place.',{size:15,tag:'F'});}
{const s=content('v8-Chain','Flowchart','Grey: inherited from LEACH/HEED/v3/v5. Green: new in v8. Orange: new in v8-Chain.');
 img(s,'img/v8_chain_flowchart_slide.png',0.7,1.3,11.9,5.45,1800,1667);}
{const s=content('v8-Chain','Network structure in round 1','Real simulation state (seed 12345), not an illustration.');
 img(s,'img/v8_chain_topology.png',0.7,1.3,11.9,5.45,1800,974);}

// ===== SECTION 7
section('07','Results','Center vs. far BS · ablation · robustness · comparison');
{const s=content('Results','BS at the field center','v8-Chain = v8 at the center (no relays). The big gains vs. v7: +1070 rounds FND and +0.84 pp PDR.');
 table(s,['Protocol','FND','HND','LND','PDR'],[['v3',1730,2081,2703,'97.72%'],['v5b',1730,2091,'3203*','97.31%'],['v7 (Center)',1551,1976,2066,'98.43%'],['v7.1 Multihop',1491,1991,2086,'98.49%'],['v8-Chain',2621,2711,2756,'99.27%']],{pos:{x:0.9,y:1.6,w:6.2,colW:[2.0,1.05,1.05,1.05,1.05]},hl:i=>i===4,boldFirst:true});
 s.addText('* inflated by silent nodes',{x:0.9,y:4.62,w:6,h:0.3,fontSize:10,italic:true,color:C.GREY,fontFace:FONT,margin:0,isTextBox:true});
 stat(s,7.6,1.6,4.9,'+69%','later first node death than v7 (1551 → 2621)',{size:44});
 stat(s,7.6,3.3,4.9,'99.27%','PDR — highest among long-lived protocols',{size:44});
 stat(s,0.9,5.05,6.2,'+33%','more packets delivered than v5b with the same 50 J (201,505 → 268,610)',{size:40});}
{const s=content('Results','Far BS (50, −100)','Direct-only v8 loses at a far BS; the energy-aware relay closes the gap to the v7 chain and keeps v8\'s FND and PDR advantage.');
 table(s,['Protocol','FND','HND','LND','PDR'],[['v6 (chain)',1266,1910,2031,'97.08%'],['v7 (chain + repair)',1266,1891,1976,'98.14%'],['v8 (direct)',1471,1646,1716,'98.66%'],['v8-Chain',1716,1886,1956,'99.07%']],{pos:{x:0.9,y:1.6,w:6.2,colW:[2.0,1.05,1.05,1.05,1.05]},hl:i=>i===3,boldFirst:true});
 stat(s,7.6,1.6,4.9,'+36%','FND vs v7 (1266 → 1716)',{size:44});
 stat(s,7.6,3.3,4.9,'+0.93 pp','PDR vs v7 (98.14% → 99.07%)',{size:44});
 card(s,0.9,4.3,6.2,2.1,'Honest reading','HND and LND are within 1% of v7 (1886 / 1956 vs 1891 / 1976) — equal, not better. v8-Chain wins on first death and reliability.',{size:14.5});}
{const s=content('Network Over Time','BS at the field center','Snapshots from the simulation output: round 1 (all alive), round 1300 (batteries half used, CHs rotate), round 2621 (first node dies — FND), round 2740 (near the end). Dark red = full battery, pale = almost empty, grey x = dead.');
 img(s,'img/snap_center.png',0.7,1.4,11.9,4.4,2580,735);
 card(s,0.9,5.75,11.6,0.75,'Batteries drain evenly: all 100 nodes are still alive at round 2621, and the last one dies 135 rounds later.',null,{headSize:14,headColor:C.CH});}
{const s=content('Network Over Time','Far BS','Same view with the BS at (50, −100): CHs pass data to each other towards the BS (energy-aware relay). FND at round 1716.');
 img(s,'img/snap_far.png',0.7,1.3,11.9,5.4,2580,945);}

{const s=content('Center vs. Far BS','Same code, only the BS moves');
 const lab=['v6','v7','v8','v8-Chain'];
 lifeChart(s,lab,[1551,1551,2621,2621],[1981,1976,2711,2711],[2106,2066,2761,2756],{x:0.7,y:1.35,w:5.9,h:5.3},{title:'BS at center'});
 lifeChart(s,lab,[1266,1266,1471,1716],[1910,1891,1646,1886],[2031,1976,1716,1956],{x:6.7,y:1.35,w:5.9,h:5.3},{title:'Far BS'});}
{const s=content('Ablation','Which mechanism matters?','Leave-one-out: each row disables ONE mechanism (center BS).');
 const a=D.ablation;
 s.addChart(pres.charts.BAR,[{name:'FND',labels:a.map(x=>x[0]),values:a.map(x=>x[2])}],Object.assign({},{barDir:'bar',chartColors:[C.RED],showValue:true,dataLabelFontSize:10,dataLabelPosition:'outEnd',catAxisLabelFontFace:FONT,catAxisLabelFontSize:11,valAxisLabelFontFace:FONT,showLegend:false,valAxisMinVal:0,valAxisMaxVal:3000,catAxisOrientation:'maxMin',valGridLine:{color:'E3E0D6',size:0.75},catGridLine:{style:'none'},plotArea:{fill:{color:C.CREAM}},chartArea:{fill:{color:C.CREAM}},showTitle:true,title:'FND (rounds)',titleFontSize:13,titleColor:C.RED,titleFontFace:FONT},{x:0.7,y:1.35,w:6.6,h:5.3}));
 card(s,7.6,1.6,4.9,1.5,'I4 Direct-to-BS','Largest effect: FND 2621 → 1821 without it.',{size:14});
 card(s,7.6,3.25,4.9,1.5,'I5 Energy gate','Second: FND 2171 without it.',{size:14});
 card(s,7.6,4.9,4.9,1.5,'I2 / I1 / I3','I2 adds PDR (+0.24 pp); I1 & I3 are safety nets.',{size:14});}
{const s=content('Robustness','8 random topologies','Seeds 12345, 1, 7, 42, 99, 2024, 31337, 555.');
 table(s,['Protocol','BS','Mean FND','Mean HND','Mean LND','Mean PDR'],[['v5b','Center',1688,2119,2374,'97.56%'],['v8-Chain','Center',2618,2720,2765,'99.25%'],['v5b','Far',1152,1674,2001,'97.72%'],['v8-Chain','Far',1743,1932,1995,'99.05%']],{pos:{x:0.9,y:1.6,w:7.6,colW:[1.6,1.1,1.2,1.2,1.2,1.3]},hl:i=>i%2===1,boldFirst:true,rowH:0.65});
 card(s,8.8,1.6,3.7,4.8,'Consistent','The ranking holds in every topology.\n\nAt the far BS, v8-Chain matched or beat v7\'s LND (1976) in 6 of 8 topologies.',{size:15});}
{const s=content('Overall Comparison','Best of each family (center BS)');
 const f=[['LEACH',1409,1626,1962],['HEED',323,570,1362],['PEGASIS',1324,2353,2887],['SH-LEACH+',1247,1600,1649],['H-LEACH+',2347,2449,2499],['v3',1730,2081,2703],['v7',1551,1976,2066],['v7.1',1491,1991,2086],['v8-Chain',2621,2711,2756]];
 lifeChart(s,f.map(x=>x[0]),f.map(x=>x[1]),f.map(x=>x[2]),f.map(x=>x[3]),{x:0.7,y:1.35,w:8.1,h:5.3});
 card(s,9.0,1.6,3.5,4.8,'Reading','v8-Chain: latest first death of all.\n\nPEGASIS keeps a longer LND (single chain, short hops) but its first node dies ~1300 rounds earlier.\n\n+ = improved version.',{size:14});}
{const s=content('Overall Comparison','Reliability (PDR)');
 const f=[['LEACH',98.37],['HEED',99.69],['PEGASIS',98.67],['SH-LEACH+',99.79],['H-LEACH+',97.33],['v3',97.72],['v7',98.43],['v7.1',98.49],['v8-Chain',99.27]];
 pdrChart(s,f.map(x=>x[0]),f.map(x=>x[1]),{x:0.7,y:1.35,w:8.1,h:5.3},{min:96});
 card(s,9.0,1.6,3.5,4.8,'Reading','HEED and SH-LEACH+ deliver slightly more — but their first node dies 1,200–2,300 rounds earlier.\n\nAmong long-lived protocols, v8-Chain has the highest PDR.',{size:14});}

// ===== Findings / conclusion
{const s=content('Key Findings',null,'');
 const k=[['Architecture beats tuning','v3 (single-pass score + reuse) and v8 (CH protection + relief) produced the two largest gains; tuning intervals alone did not.'],
  ['Prevent, then repair','Handing over before a CH dies (I2) plus backup failover after it keeps clusters alive and packets flowing.'],
  ['Not every packet needs a CH','Direct-to-BS for nodes near the sink is the single largest lifetime contributor.'],
  ['Relay by energy, not by rule','A per-CH energy decision beats a fixed chain: 0 relays at the center, a chain at the far BS.'],
  ['Read LND with delivery','A long LND can hide silent nodes (v5b); FND, PDR and delivered packets expose it.']];
 k.forEach(([h,b],i)=>{const y=1.5+i*1.03; s.addShape(pres.shapes.OVAL,{x:0.9,y:y+0.12,w:0.62,h:0.62,fill:{color:C.RED},line:{color:C.RED}});
  s.addText(String(i+1),{x:0.9,y:y+0.12,w:0.62,h:0.62,fontSize:18,bold:true,color:C.WHITE,align:'center',valign:'middle',fontFace:FONT,margin:0,isTextBox:true});
  s.addText([{text:h+'  ',options:{bold:true,color:C.RED}},{text:b,options:{color:C.CH}}],{x:1.75,y,w:10.7,h:0.88,fontSize:15,valign:'middle',fontFace:FONT,margin:0,isTextBox:true});});}
{const s=content('Recommendations','Which configuration, when?');
 table(s,['Deployment','Recommended','Why'],[['Sink inside / near the field','v8-Chain','Latest FND; PDR 99.27%; behaves as v8'],['Sink far from the field','v8-Chain','Best far-BS FND & PDR; relay forms automatically'],['Simplest good option','v7.1 or v5-exp (interval 5)','PDR ≈ 98.3–98.5% without extra logic'],['Judging "lifetime"','Use FND + PDR + delivered packets','LND alone can be misleading']],{pos:{x:0.9,y:1.6,w:11.6,colW:[3.3,3.3,5.0]},center:9,hl:i=>i<2,boldFirst:true,rowH:0.8,fs:16});}
{const s=content('Limitations & Future Work',null,'');
 card(s,0.9,1.6,5.65,4.8,'Limitations','• Simulation only (ns-3, 100 nodes, analytical radio)\n• Two BS positions, one field size, 8 topologies\n• Direct-to-BS gain depends on the sink being near\n• Single CH deaths from energy depletion; no simultaneous or malicious failures',{size:15});
 card(s,6.85,1.6,5.65,4.8,'Future work','• Hardware / SDR testbed validation\n• Sweep BS positions, field sizes and node counts\n• Compare the greedy relay rule with an optimal minimum-energy tree\n• Evaluate together with the hybrid-cryptography layer under attack',{size:15,fill:C.PINK,border:C.ROSE});}
{const s=content('Conclusion',null,'');
 text(s,['Five existing protocols were reproduced fairly in one environment; two published hybrids were corrected.','An original protocol was evolved one mechanism at a time, from v1 to v8-Chain.','v8-Chain protects cluster heads before and after failure, lets nodes near the sink bypass their CH, restricts the CH role to strong nodes, and relays only when it saves energy.'],{x:0.9,y:1.6,w:6.6,h:4.8,fontSize:16});
 s.addShape(pres.shapes.ROUNDED_RECTANGLE,{x:7.9,y:1.6,w:4.6,h:4.8,rectRadius:0.12,fill:{color:C.RED},line:{color:C.RED}});
 s.addText([{text:'v8-Chain',options:{bold:true,fontSize:24,breakLine:true}},{text:'Center BS',options:{bold:true,fontSize:14,color:'F3E3E1',breakLine:true}},{text:'FND 2621 · PDR 99.27%',options:{fontSize:17,breakLine:true}},{text:' ',options:{fontSize:8,breakLine:true}},{text:'Far BS',options:{bold:true,fontSize:14,color:'F3E3E1',breakLine:true}},{text:'FND 1716 · PDR 99.07%',options:{fontSize:17,breakLine:true}},{text:' ',options:{fontSize:8,breakLine:true}},{text:'One configuration for both deployments.',options:{italic:true,fontSize:14}}],{x:8.2,y:1.8,w:4.0,h:4.4,color:C.WHITE,fontFace:FONT,valign:'middle',margin:0,paraSpaceAfter:4,isTextBox:true});}
// ===== References
{const R=D.refs; [[0,8],[8,15]].forEach(([a,b],k)=>{const s=content('References',k?'(2/2)':'(1/2)');
 s.addText(R.slice(a,b).map((r,i)=>({text:`[${a+i+1}]  ${r}`,options:{breakLine:i<b-a-1}})),{x:0.9,y:1.5,w:11.6,h:5.1,fontSize:12.5,color:C.CH,fontFace:FONT,valign:'top',paraSpaceAfter:9,margin:0,isTextBox:true});});}
{const s=pres.addSlide(); frame(s); net(s,10.1,0.22,1.05); net(s,0.3,7.28,0.6,C.RED,false,true);
 s.addText('Thank you',{x:0.9,y:2.3,w:11.5,h:1.4,fontSize:54,bold:true,color:C.RED,align:'center',fontFace:FONT,margin:0,isTextBox:true});
 s.addText('Questions & Discussion',{x:0.9,y:3.7,w:11.5,h:0.8,fontSize:24,color:C.CH,align:'center',fontFace:FONT,margin:0,isTextBox:true});
 s.addText('Eng. Rahma Khaled Oshba',{x:0.9,y:4.8,w:11.5,h:0.5,fontSize:16,bold:true,color:C.RED,align:'center',fontFace:FONT,margin:0,isTextBox:true});}
pres.writeFile({fileName:'Thesis_Defense_v8-Chain.pptx'}).then(f=>console.log('written',f));

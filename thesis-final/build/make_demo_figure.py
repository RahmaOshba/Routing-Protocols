# Figure + numbers for the packet-level demo, from the real ns-3 run (demo_output.txt)
import re, json, os
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(HERE,'fig')
txt=open(os.path.join(HERE,'demo_output.txt')).read()
rounds=[list(map(int,re.findall(r'->S(\d+)',l))) for l in txt.splitlines() if l.startswith('=== Round')]
num=lambda k: float(re.search(k+r'\s*=\s*([\d.]+)',txt).group(1))
res={'rounds':len(rounds),'readingsGenerated':int(num('Readings generated')),'readingsDelivered':int(num('Readings at the sink')),
     'pdr':num(r'PDR \(readings\)'),'packetsToSink':int(num('Packets to the sink')),'chPerRound':rounds}
json.dump(res,open(os.path.join(OUT,'demo_results.json'),'w'),indent=1)
cx=[12,40,68]; off=[(-6,-5),(6,-6),(-5,6),(7,5)]
pos=[(cx[i//4]+off[i%4][0],45+off[i%4][1]) for i in range(12)]; sink=(40,10)
COL=['#2a78d6','#1baf7a','#7a4fd0']; INK='#1f1f1d'
fig,(a,b)=plt.subplots(1,2,figsize=(12,5.2),gridspec_kw={'width_ratios':[1.35,1]})
ch=rounds[0]
for i,(x,y) in enumerate(pos):
    c=i//4
    if i in ch: continue
    h=pos[ch[c]]
    a.add_patch(FancyArrowPatch((x,y),h,arrowstyle='-|>',mutation_scale=12,color=COL[c],lw=1.2,shrinkA=7,shrinkB=11))
    a.scatter(x,y,s=160,color=COL[c],edgecolor='white',linewidth=1.5,zorder=3); a.text(x,y+2.6,f'S{i}',ha='center',fontsize=9,color=INK)
for c,k in enumerate(ch):
    x,y=pos[k]
    a.add_patch(FancyArrowPatch((x,y),sink,arrowstyle='-|>',mutation_scale=14,color=INK,lw=1.6,ls='--',shrinkA=11,shrinkB=16))
    a.scatter(x,y,s=420,color='#e34948',edgecolor=INK,linewidth=1.5,zorder=4); a.text(x,y+3.3,f'CH S{k}',ha='center',fontsize=10,fontweight='bold',color='#b42318')
a.scatter(*sink,s=900,marker='s',color='#f2c200',edgecolor=INK,zorder=4); a.text(sink[0],sink[1]-5.5,'SINK',ha='center',fontweight='bold')
a.text(40,59,'members → CH: TDMA slots (0.5 s apart)',ha='center',fontsize=10,color='#52514e')
a.text(55,25,'one fused\npacket per CH',ha='left',fontsize=10,color=INK)
a.set_xlim(-2,82); a.set_ylim(0,63); a.set_aspect('equal'); a.axis('off'); a.set_title('Round 1: 12 sensors, 3 clusters, 1 sink',loc='left',fontsize=12,color=INK)
# CH rotation table
b.axis('off'); b.set_title('Cluster head of every round (real ns-3 run)',loc='left',fontsize=12,color=INK)
b.set_xlim(0,4); b.set_ylim(len(rounds)+1.2,0)
for c in range(3): b.text(c+1.5,0.5,f'Cluster {c}',ha='center',fontweight='bold',color=COL[c],fontsize=11)
for r,chs in enumerate(rounds):
    b.text(0.4,r+1.5,f'Round {r+1}',va='center',fontsize=11,color=INK)
    for c,k in enumerate(chs):
        b.add_patch(plt.Rectangle((c+1.1,r+1.1),0.8,0.8,color=COL[c],alpha=0.18))
        b.text(c+1.5,r+1.5,f'S{k}',ha='center',va='center',fontsize=11,color=INK)
b.text(0.4,len(rounds)+1.05+0.1,f"PDR {res['pdr']:.0f}% · {res['readingsGenerated']} readings in {res['packetsToSink']} packets to the sink",fontsize=10,color='#52514e',va='top')
fig.tight_layout(); fig.savefig(os.path.join(OUT,'demo_layout.png'),dpi=200,facecolor='white')
print(res)

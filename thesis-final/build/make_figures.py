# Builds every figure used by the deck and the reports from ../../results
import csv, os, glob, statistics as st
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); R=os.path.join(HERE,'..','..','results'); OUT=os.path.join(HERE,'fig')
SNAP=os.environ.get('SNAP_DIR','')
os.makedirs(OUT,exist_ok=True)
BLUE,ORANGE,AQUA='#2a78d6','#eb6834','#1baf7a'; GREY='#9a9a96'; INK='#1f1f1d'; MUTED='#6b6a66'; GRID='#e6e5e0'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.edgecolor':'#c9c8c2','axes.labelcolor':INK,
  'xtick.color':MUTED,'ytick.color':MUTED,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'axes.grid.axis':'y',
  'grid.color':GRID,'grid.linewidth':0.8,'axes.axisbelow':True,'figure.dpi':100,'savefig.dpi':200,'legend.frameon':False})
S={r['run']:r for r in csv.DictReader(open(os.path.join(R,'summary_all.csv')))}
def v(run): r=S[run]; return int(r['FND']),int(r['HND']),int(r['LND']),float(r['PDR'])*100
def save(fig,name): fig.savefig(os.path.join(OUT,name),bbox_inches='tight',facecolor='white'); plt.close(fig)
def rounds_csv(path):
    rows=list(csv.DictReader(open(path))); return [int(x['Round']) for x in rows],[int(x['Alive']) for x in rows],[float(x['Residual_Energy_J']) for x in rows]

FAM=[('LEACH','leach_EDITED','2_EDITED'),('HEED','heed_EDITED','2_EDITED'),('PEGASIS','pegasis_EDITED','2_EDITED'),
     ('SH-LEACH+','shleach_IMPROVED','3_IMPROVED'),('H-LEACH+','hleach_IMPROVED','3_IMPROVED'),('EECH-HEED+','eechheed_IMPROVED','3_IMPROVED'),
     ('v8-Chain','v8_chain_center','4_PROPOSED')]

def grouped(ax,labels,data,hl=None,ymax=None,valfont=8):
    x=np.arange(len(labels)); w=0.26
    for k,(nm,c) in enumerate([('FND',BLUE),('HND',ORANGE),('LND',AQUA)]):
        vals=[d[k] for d in data]
        b=ax.bar(x+(k-1)*w,vals,w-0.03,color=c,label=nm,zorder=3)
        for xi,val in zip(x+(k-1)*w,vals): ax.text(xi,val+25,str(val),ha='center',va='bottom',fontsize=valfont,color=MUTED,rotation=90)
    if hl is not None: ax.axvspan(hl-0.45,hl+0.45,color='#e8f0fb',zorder=0)
    ax.set_xticks(x); ax.set_xticklabels(labels); ax.set_ylabel('Rounds')
    if ymax: ax.set_ylim(0,ymax)
    ax.legend(ncol=3,loc='upper left')

# F1 lifetime of the best of every family
fig,ax=plt.subplots(figsize=(10,4.6)); d=[v(r)[:3] for _,r,_ in FAM]
grouped(ax,[f for f,_,_ in FAM],d,hl=6,ymax=4200); ax.set_title('Network lifetime — unified environment, BS at the centre',loc='left',fontweight='bold',color=INK)
save(fig,'f1_lifetime_families.png')
# F2 PDR
fig,ax=plt.subplots(figsize=(10,3.6)); p=[v(r)[3] for _,r,_ in FAM]
cols=[GREY]*6+[BLUE]; b=ax.bar([f for f,_,_ in FAM],p,0.55,color=cols,zorder=3)
for i,val in enumerate(p): ax.text(i,val+0.02,f'{val:.2f}%',ha='center',va='bottom',fontsize=10,color=INK)
ax.set_ylim(98.5,100.0); ax.set_ylabel('PDR (%)'); ax.set_title('Packet delivery ratio',loc='left',fontweight='bold',color=INK)
save(fig,'f2_pdr_families.png')
# F3 alive nodes + F10 residual energy (highlight v8-Chain)
for key,idx,ylabel,name,title in [('alive',1,'Alive nodes','f3_alive_curves.png','Alive nodes per round'),('energy',2,'Residual energy (J)','f10_energy_curves.png','Residual network energy per round')]:
    fig,ax=plt.subplots(figsize=(10,4.6)); labels=[]
    for fam,run,grp in FAM:
        rr,al,en=rounds_csv(os.path.join(R,grp,run,'results.csv')); y=al if idx==1 else en
        hl=fam=='v8-Chain'
        ax.plot(rr,y,color=BLUE if hl else GREY,lw=2.6 if hl else 1.4,zorder=4 if hl else 2)
        labels.append((rr[-1],fam,hl))
    top=(100 if idx==1 else 50)
    for k,(xe,fam,hl) in enumerate(sorted(labels)):   # label every curve where it ends, staggered in height
        ye=top*(0.12+0.11*k)
        ax.annotate(fam,(xe,0),xytext=(xe+40,ye),fontsize=9,color=BLUE if hl else MUTED,fontweight='bold' if hl else 'normal',
                    arrowprops=dict(arrowstyle='-',color=BLUE if hl else '#c9c8c2',lw=0.8))
    ax.set_xlabel('Round'); ax.set_ylabel(ylabel); ax.set_xlim(0,3900); ax.set_title(title+' (v8-Chain in blue)',loc='left',fontweight='bold',color=INK)
    save(fig,name)
# F4 evolution FND
EV=[('v1','v1_heed_election_leach_join'),('v2','v2_fairness_penalty'),('v3','v3_single_pass_reuse_int5'),('v4','v4_reuse_int15'),('v5','v5_backup_int15'),
    ('v5-exp','v5x_backup_repair_int5'),('v5b','v5b_energy_aware_repair'),('v6','v6_chain_center'),('v7','v7_chain_backup_center'),('v7.1','v7_1_multihop_int5'),('v8','v8_center'),('v8-Chain','v8_chain_center')]
fig,ax=plt.subplots(figsize=(10,4.2)); f=[v(r)[0] for _,r in EV]; pd=[v(r)[3] for _,r in EV]
cols=[BLUE if n in('v3','v8','v8-Chain') else GREY for n,_ in EV]
ax.bar([n for n,_ in EV],f,0.6,color=cols,zorder=3)
for i,(val,pp) in enumerate(zip(f,pd)): ax.text(i,val+30,f'{val}',ha='center',fontsize=10,color=INK); ax.text(i,60,f'{pp:.1f}%',ha='center',fontsize=8,color='white',rotation=90,va='bottom')
ax.set_ylabel('FND (rounds)'); ax.set_ylim(0,2900); ax.set_title('Evolution of the proposed protocol — first node death (PDR inside the bars)',loc='left',fontweight='bold',color=INK)
save(fig,'f4_evolution.png')
# F5 ablation
AB=[('v8 (full)','v8_center'),('− I1 epoch fix','v8_without_I1'),('− I2 handover','v8_without_I2'),('− I3 re-join','v8_without_I3'),('− I5 energy gate','v8_without_I5'),('− I4 direct-to-BS','v8_without_I4')]
fig,ax=plt.subplots(figsize=(8,3.6)); f=[v(r)[0] for _,r in AB]
cols=[BLUE]+[ORANGE if val<2400 else GREY for val in f[1:]]
ax.barh([n for n,_ in AB][::-1],f[::-1],0.6,color=cols[::-1],zorder=3); ax.grid(axis='x'); ax.grid(axis='y',visible=False)
for i,val in enumerate(f[::-1]): ax.text(val+20,i,str(val),va='center',fontsize=10,color=INK)
ax.set_xlim(0,2900); ax.set_xlabel('FND (rounds)'); ax.set_title('Ablation — v8 with one improvement removed',loc='left',fontweight='bold',color=INK)
save(fig,'f5_ablation.png')
# F6 routing modes
fig,axs=plt.subplots(1,2,figsize=(10,3.8),sharey=False)
for ax,bs,tt in [(axs[0],'center','BS at the centre (50,50)'),(axs[1],'farBS','BS far away (50,−100)')]:
    lab=['Direct\n(v8)','Ordered\nchain','Energy-aware\nrelay (v8-Chain)']; f=[v(f'{bs}_mode{m}')[0] for m in range(3)]
    ax.bar(lab,f,0.55,color=[GREY,GREY,BLUE],zorder=3)
    for i,val in enumerate(f): ax.text(i,val+20,str(val),ha='center',fontsize=10,color=INK)
    ax.set_title(tt,fontsize=11,color=INK); ax.set_ylim(0,2900)
axs[0].set_ylabel('FND (rounds)'); fig.suptitle('How CHs reach the BS',x=0.07,ha='left',fontweight='bold',color=INK); fig.tight_layout()
save(fig,'f6_routing.png')
# F7 robustness
fig,ax=plt.subplots(figsize=(9,3.8)); names=[('v5b','v5b_center'),('v8','v8_center'),('v8-Chain','v8_chain_center'),('v8 far BS','v8_farBS'),('v8-Chain far BS','v8_chain_farBS')]
for i,(n,c) in enumerate(names):
    ys=[int(S[k]['FND']) for k in S if k.startswith(c+'_seed')]
    col=BLUE if 'Chain' in n else GREY
    ax.scatter([i]*len(ys),ys,s=45,color=col,zorder=3,edgecolor='white',linewidth=1)
    ax.hlines(st.mean(ys),i-0.25,i+0.25,color=INK,lw=2); ax.text(i+0.28,st.mean(ys),f'{st.mean(ys):.0f}',va='center',fontsize=10,color=INK)
ax.set_xticks(range(len(names))); ax.set_xticklabels([n for n,_ in names]); ax.set_ylabel('FND (rounds)'); ax.set_ylim(1200,2700)
ax.set_title('Robustness — 8 random topologies (dots) and their mean (bar)',loc='left',fontweight='bold',color=INK)
save(fig,'f7_robustness.png')
# F8 hybrids ORIGINAL/EDITED/IMPROVED
fig,axs=plt.subplots(1,3,figsize=(11,3.6),sharey=True)
for ax,(n,k) in zip(axs,[('SH-LEACH','shleach'),('H-LEACH','hleach'),('EECH-HEED','eechheed')]):
    st3=[v(f'{k}_{s}')[0] for s in ('ORIGINAL','EDITED','IMPROVED')]
    ax.bar(['Original','Edited','Improved'],st3,0.55,color=[GREY,GREY,BLUE],zorder=3)
    for i,val in enumerate(st3): ax.text(i,val+20,str(val),ha='center',fontsize=10,color=INK)
    ax.set_title(n,fontsize=12,color=INK,fontweight='bold')
axs[0].set_ylabel('FND (rounds)'); axs[0].set_ylim(0,1800); fig.tight_layout()
save(fig,'f8_hybrids.png')
# F9 validation
fig,ax=plt.subplots(figsize=(8,3.6)); cats=['LEACH LND','PEGASIS FND','PEGASIS LND','EECH-HEED FND']
pub=[1312,1578,2192,1250]; ours=[v('leach_ORIGINAL')[2],v('pegasis_ORIGINAL')[0],v('pegasis_ORIGINAL')[2],v('eechheed_ORIGINAL')[0]]
x=np.arange(4); ax.bar(x-0.18,pub,0.34,color=GREY,label='Published',zorder=3); ax.bar(x+0.18,ours,0.34,color=BLUE,label='Our reproduction',zorder=3)
for i,(a,b) in enumerate(zip(pub,ours)): ax.text(i-0.18,a+20,a,ha='center',fontsize=9,color=MUTED); ax.text(i+0.18,b+20,b,ha='center',fontsize=9,color=INK)
ax.set_xticks(x); ax.set_xticklabels(cats); ax.set_ylabel('Rounds'); ax.legend(loc='upper left'); ax.set_ylim(0,2600)
ax.set_title('Validation — our code in each paper\'s own settings',loc='left',fontweight='bold',color=INK)
save(fig,'f9_validation.png')
# F11 cluster snapshots
if SNAP:
    pos={}
    for r in csv.DictReader(open(os.path.join(SNAP,'node-positions.csv'))): pos[int(r['Node'])]=(float(r['X']),float(r['Y']))
    for tag,bs in [('center',(50,50)),('farBS',(50,-100))]:
        allr=[r for r in csv.DictReader(open(os.path.join(SNAP,f'v8_chain_{tag}-node-energy.csv'))) if int(r['Round'])<=400]
        cnt={}
        for r in allr:
            if r['Is_CH']=='1': cnt[int(r['Round'])]=cnt.get(int(r['Round']),0)+1
        rnd=min((k for k in cnt if cnt[k]>=5 and k>=50),default=100)
        rows=[r for r in allr if int(r['Round'])==rnd]
        fig,ax=plt.subplots(figsize=(6,6.2 if tag=='center' else 7.6)); ax.grid(False)
        chs=[int(r['Node']) for r in rows if r['Is_CH']=='1']
        pal=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948']
        cc={c:pal[i%len(pal)] for i,c in enumerate(chs)}
        for r in rows:
            n=int(r['Node']); ch=int(r['ClusterHead']); x,y=pos[n]
            if r['Alive']!='1': continue
            if n in chs: continue
            if ch in cc:
                ax.plot([x,pos[ch][0]],[y,pos[ch][1]],color=cc[ch],lw=0.8,alpha=0.6,zorder=1); ax.scatter(x,y,s=28,color=cc[ch],zorder=2)
            else: ax.scatter(x,y,s=28,color=GREY,zorder=2)
        # next hop exactly as ComputeNextHop() in v8_chain_*.cc (CHAIN_MODE 2)
        import math
        def tx(d): return 2000*(50e-9+(10e-12*d*d if d<math.sqrt(10/0.0013) else 0.0013e-12*d**4))
        dbs=lambda c: math.dist(pos[c],bs)
        relays=0
        for c in chs:
            best=tx(dbs(c)); nh=None
            for j in chs:
                if j==c or dbs(j)>=dbs(c): continue
                via=tx(math.dist(pos[c],pos[j]))+2000*55e-9
                if via<best: best=via; nh=j
            tgt=bs if nh is None else pos[nh]
            if nh is not None: relays+=1
            ax.annotate('',xy=tgt,xytext=pos[c],arrowprops=dict(arrowstyle='-|>',color=INK if nh is None else '#d4380d',lw=1.3 if nh is not None else 1,ls='--' if nh is None else '-'),zorder=1)
            ax.scatter(*pos[c],s=160,color=cc[c],edgecolor=INK,linewidth=1.5,marker='o',zorder=3)
        ax.scatter(*bs,s=320,marker='s',color='#f2c200',edgecolor=INK,zorder=4); ax.annotate('BS',bs,xytext=(8,-4),textcoords='offset points',fontweight='bold')
        ax.set_aspect('equal'); ax.set_xlim(-5,105); ax.set_ylim((-5 if tag=='center' else -110),105)
        ax.set_title(f'v8-Chain clusters at round {rnd} — BS {"at the centre" if tag=="center" else "far away"}',fontsize=11,color=INK,loc='left')
        ax.legend(handles=[Line2D([],[],marker='o',ls='',markersize=11,markerfacecolor='white',markeredgecolor=INK,label='Cluster head'),
                           Line2D([],[],marker='o',ls='',markersize=6,color=GREY,label='Member (cluster colour)'),
                           Line2D([],[],color=INK,ls='--',label='CH → BS (direct)'),
                           Line2D([],[],color='#d4380d',label='CH → CH relay')],loc='upper center',bbox_to_anchor=(0.5,-0.06),ncol=2,fontsize=9)
        save(fig,f'f11_topology_{tag}.png')
print('figures in',OUT)

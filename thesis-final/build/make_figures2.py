# Extra figures for the deck and the SOTA report: background diagrams, energy
# model, paper-vs-code charts, hybrid CH counts, security cost, demo packets.
import csv, os, math, struct
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch, Rectangle
import numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..','..'); R=os.path.join(ROOT,'results'); OUT=os.path.join(HERE,'fig')
BLUE,ORANGE,AQUA,RED,GOLD='#2a78d6','#eb6834','#1baf7a','#e34948','#f2c200'; GREY='#9a9a96'; INK='#1f1f1d'; MUTED='#6b6a66'; GRID='#e6e5e0'; NAVY='#14213d'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.edgecolor':'#c9c8c2','axes.labelcolor':INK,
  'xtick.color':MUTED,'ytick.color':MUTED,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'axes.grid.axis':'y',
  'grid.color':GRID,'grid.linewidth':0.8,'axes.axisbelow':True,'savefig.dpi':200,'legend.frameon':False})
S={r['run']:r for r in csv.DictReader(open(os.path.join(R,'summary_all.csv')))}
def v(run): r=S[run]; return int(r['FND']),int(r['HND']),int(r['LND']),float(r['PDR'])*100
def save(fig,name): fig.savefig(os.path.join(OUT,name),bbox_inches='tight',facecolor='white'); plt.close(fig)
def blank(w,h):
    fig,ax=plt.subplots(figsize=(w,h)); ax.set_axis_off(); ax.set_xlim(0,w); ax.set_ylim(0,h); ax.set_aspect('equal'); return fig,ax
def box(ax,x,y,w,h,text,fc,ec=None,fs=11,tc=INK,bold=False):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.02,rounding_size=0.12',fc=fc,ec=ec or fc,lw=1.5))
    ax.text(x+w/2,y+h/2,text,ha='center',va='center',fontsize=fs,color=tc,fontweight='bold' if bold else 'normal',wrap=True)
def arrow(ax,a,b,c=MUTED,lw=1.6,ls='-',ms=14):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=ms,color=c,lw=lw,linestyle=ls,shrinkA=4,shrinkB=4))

# ---------------- B1 WSN architecture ----------------
rng=np.random.default_rng(7)
fig,ax=blank(12,5)
ax.add_patch(FancyBboxPatch((0.3,0.4),6.2,4.2,boxstyle='round,pad=0.02,rounding_size=0.2',fc='#f3f6fb',ec='#c9d4e8',lw=1.5))
ax.text(3.4,4.35,'Sensing field',ha='center',fontsize=12,color=MUTED)
pts=rng.uniform([0.7,0.8],[6.1,3.9],(26,2))
for p in pts: ax.add_patch(Circle(p,0.09,color=BLUE,zorder=3))
path=[pts[i] for i in np.argsort(-pts[:,0])[:0]]
sink=np.array([7.6,2.5])
near=sorted(pts,key=lambda p:-p[0])[:5]
for p in near: arrow(ax,p,sink,c='#9fb8de',lw=1.2,ms=10)
ax.add_patch(Circle(sink,0.32,color=GOLD,zorder=4)); ax.text(sink[0],sink[1]-0.65,'Sink / base station',ha='center',fontsize=11)
box(ax,8.9,2.05,1.4,0.9,'Internet',  '#e8f0fb',ec='#9fb8de',fs=11)
box(ax,10.6,2.05,1.2,0.9,'User',      '#e8f7f1',ec='#8fd3b8',fs=11)
arrow(ax,(7.95,2.5),(8.9,2.5)); arrow(ax,(10.3,2.5),(10.6,2.5))
ax.add_patch(Circle((0.8,0.15),0.09,color=BLUE)); ax.text(1.0,0.15,'sensor node (battery powered)',va='center',fontsize=10,color=MUTED)
save(fig,'b1_wsn.png')

# ---------------- B2 sensor node ----------------
fig,ax=blank(10,3.4)
blocks=[('Sensing unit\n(sensor + ADC)',0.2,BLUE),('Processing unit\n(MCU + memory)',2.7,ORANGE),('Radio\ntransceiver',5.2,AQUA)]
for t,x,c in blocks: box(ax,x,1.4,2.1,1.3,t,c,fs=11,tc='white',bold=True)
arrow(ax,(2.3,2.05),(2.7,2.05),c=INK); arrow(ax,(4.8,2.05),(5.2,2.05),c=INK)
box(ax,1.4,0.1,4.8,0.8,'Battery — cannot be recharged',RED,fs=11,tc='white',bold=True)
for x in (1.25,3.75,6.25): arrow(ax,(3.75 if x==3.75 else x,0.9),(x,1.4),c=RED,lw=1.2,ms=10)
ax.text(7.6,2.45,'Radio uses most\nof the energy',fontsize=12,color=INK,fontweight='bold'); ax.text(7.6,1.55,'sending and even\nlistening cost energy',fontsize=11,color=MUTED)
save(fig,'b2_node.png')

# ---------------- B3 flat vs clustered ----------------
fig,axs=plt.subplots(1,2,figsize=(12,5.2))
pts=rng.uniform(0,100,(40,2)); bs=np.array([50,-25])
for ax,t in zip(axs,['Without clustering: every node sends far','With clustering: short hops + one long packet per cluster']):
    ax.set_xlim(-5,105); ax.set_ylim(-35,105); ax.set_aspect('equal'); ax.set_axis_off(); ax.set_title(t,fontsize=12,color=INK,fontweight='bold')
    ax.add_patch(Rectangle((bs[0]-4,bs[1]-4),8,8,color=GOLD,zorder=4)); ax.text(bs[0]+7,bs[1],'BS',va='center',fontsize=11,fontweight='bold')
for p in pts: axs[0].plot([p[0],bs[0]],[p[1],bs[1]],color='#c8c7c2',lw=0.8,zorder=1); axs[0].add_patch(Circle(p,1.6,color=GREY,zorder=3))
chs=np.array([[20,75],[75,78],[25,25],[78,30]]); cols=[BLUE,ORANGE,AQUA,'#8a5cd6']
lab=np.argmin(((pts[:,None,:]-chs[None])**2).sum(-1),1)
for p,l in zip(pts,lab):
    axs[1].plot([p[0],chs[l][0]],[p[1],chs[l][1]],color=cols[l],lw=0.9,alpha=0.7,zorder=1); axs[1].add_patch(Circle(p,1.6,color=cols[l],zorder=3))
for c,col in zip(chs,cols):
    axs[1].add_patch(Circle(c,3.4,fc=col,ec=INK,lw=1.5,zorder=4)); axs[1].plot([c[0],bs[0]],[c[1],bs[1]],'--',color=INK,lw=1.3,zorder=2)
axs[1].text(0,-33,'● member   ◉ cluster head (CH)   - - - CH → BS',fontsize=10,color=MUTED)
save(fig,'b3_clustering.png')

# ---------------- B4 one round ----------------
fig,ax=blank(12,2.6)
box(ax,0.1,0.9,3.6,1.1,'SETUP\nelect CHs · join\nTDMA schedule',ORANGE,fs=10.5,tc='white',bold=True)
xs=np.linspace(3.9,9.9,6)
for i,x in enumerate(xs[:-1]): box(ax,x,0.9,1.05,1.1,f'slot {i+1}\nmember→CH',BLUE,fs=9,tc='white')
box(ax,xs[-1],0.9,2.0,1.1,'CH fuses data\none packet → BS',AQUA,fs=9.5,tc='white',bold=True)
ax.annotate('',xy=(11.9,0.55),xytext=(0.1,0.55),arrowprops=dict(arrowstyle='->',color=MUTED)); ax.text(6,0.2,'one round (repeated; the CH role rotates between rounds)',ha='center',fontsize=10,color=MUTED)
ax.text(3.9,2.2,'STEADY STATE (TDMA: one member at a time, no collisions)',fontsize=10,color=BLUE,fontweight='bold')
save(fig,'b4_round.png')

# ---------------- E1 energy vs distance ----------------
d=np.linspace(1,140,400); k=2000; E_ELEC,FS,MP=50e-9,10e-12,0.0013e-12; d0=math.sqrt(FS/MP)
tx=np.where(d<d0,k*(E_ELEC+FS*d*d),k*(E_ELEC+MP*d**4))*1e6
fig,ax=plt.subplots(figsize=(8.5,4.2))
ax.plot(d,tx,color=BLUE,lw=2.5,label='transmit one 2000-bit packet'); ax.axhline(k*E_ELEC*1e6,color=ORANGE,lw=2,ls='--',label='receive the same packet')
ax.axvline(d0,color=GREY,ls=':',lw=1.5); ax.text(d0+2,420,f'd0 ≈ {d0:.1f} m\n(d² → d⁴)',color=INK,fontsize=10)
for dd in (10,50,100):
    e=(k*(E_ELEC+FS*dd*dd) if dd<d0 else k*(E_ELEC+MP*dd**4))*1e6; ax.plot(dd,e,'o',color=INK,ms=5); ax.text(dd+2,e+12,f'{e:.0f} µJ',fontsize=9.5,color=INK)
ax.set_xlabel('Distance (m)'); ax.set_ylabel('Energy (µJ)'); ax.set_ylim(0,560); ax.legend(loc='upper left')
save(fig,'e1_energy_distance.png')

# ---------------- P1 baselines: published vs ORIGINAL vs EDITED ----------------
fig,axs=plt.subplots(1,3,figsize=(13,4.1),sharey=True)
pub={'leach':(932,None,1312),'heed':(None,None,None),'pegasis':(1578,2082,2192)}
for ax,(n,k) in zip(axs,[('LEACH','leach'),('HEED','heed'),('PEGASIS','pegasis')]):
    sets=[('Paper',pub[k],GREY),('Our ORIGINAL',v(k+'_ORIGINAL')[:3],BLUE),('Our EDITED',v(k+'_EDITED')[:3],ORANGE)]
    x=np.arange(3); w=0.26
    for j,(nm,vals,c) in enumerate(sets):
        for i,val in enumerate(vals):
            if val is None: continue
            ax.bar(x[i]+(j-1)*w,val,w-0.03,color=c,zorder=3,label=nm if i==0 or (k=='leach' and j==0 and i==2) else None)
            ax.text(x[i]+(j-1)*w,val+40,str(val),ha='center',fontsize=8,color=MUTED,rotation=90)
    ax.set_xticks(x); ax.set_xticklabels(['FND','HND','LND']); ax.set_title(n,fontweight='bold',color=INK)
    if k=='heed': ax.text(1,3300,'paper: graphs only',ha='center',fontsize=9,color=MUTED)
axs[0].set_ylabel('Rounds'); axs[0].set_ylim(0,4000)
h=[plt.Rectangle((0,0),1,1,color=c) for c in (GREY,BLUE,ORANGE)]; fig.legend(h,['Published','Our code — paper settings (ORIGINAL)','Our code — unified environment (EDITED)'],loc='upper center',ncol=3,bbox_to_anchor=(0.5,1.05))
fig.tight_layout(); save(fig,'p1_baselines.png')

# ---------------- H1 hybrids: CHs per round EDITED vs IMPROVED ----------------
def chs(folder):
    rows=list(csv.DictReader(open(os.path.join(R,folder,'results.csv')))); return [int(r['Round']) for r in rows],[int(r['CH_Count']) for r in rows]
def smooth(y,n=10): return np.convolve(y,np.ones(n)/n,mode='valid')
fig,axs=plt.subplots(1,3,figsize=(13,3.8),sharey=True)
for ax,(n,k,lim) in zip(axs,[('SH-LEACH','shleach',700),('H-LEACH','hleach',700),('EECH-HEED','eechheed',700)]):
    for lab,f,c in [('Edited (paper algorithm)',f'2_EDITED/{k}_EDITED',GREY),('Improved (our fix)',f'3_IMPROVED/{k}_IMPROVED',BLUE)]:
        r,cc=chs(f); r=r[:lim]; cc=cc[:lim]; ax.plot(r[:len(smooth(cc))],smooth(cc),color=c,lw=2,label=lab)
    ax.set_title(n,fontweight='bold',color=INK); ax.set_xlabel('Round')
axs[0].set_ylabel('Cluster heads per round\n(10-round average)'); axs[0].legend(loc='upper left')
fig.tight_layout(); save(fig,'h1_hybrid_ch.png')

# ---------------- H2 hybrids FND/HND/LND ORIGINAL/EDITED/IMPROVED ----------------
fig,axs=plt.subplots(1,3,figsize=(13,4),sharey=True)
for ax,(n,k) in zip(axs,[('SH-LEACH','shleach'),('H-LEACH','hleach'),('EECH-HEED','eechheed')]):
    x=np.arange(3); w=0.26
    for j,(s,c) in enumerate([('ORIGINAL',GREY),('EDITED',ORANGE),('IMPROVED',BLUE)]):
        vals=v(f'{k}_{s}')[:3]
        ax.bar(x+(j-1)*w,vals,w-0.03,color=c,zorder=3)
        for i,val in enumerate(vals): ax.text(x[i]+(j-1)*w,val+40,str(val),ha='center',fontsize=8,color=MUTED,rotation=90)
    ax.set_xticks(x); ax.set_xticklabels(['FND','HND','LND']); ax.set_title(n,fontweight='bold',color=INK)
axs[0].set_ylabel('Rounds'); axs[0].set_ylim(0,4400)
h=[plt.Rectangle((0,0),1,1,color=c) for c in (GREY,ORANGE,BLUE)]; fig.legend(h,['ORIGINAL (paper settings)','EDITED (unified)','IMPROVED (unified + our fix)'],loc='upper center',ncol=3,bbox_to_anchor=(0.5,1.05))
fig.tight_layout(); save(fig,'h2_hybrids_all.png')

# ---------------- C1 final FND ranking ----------------
fam=[('HEED','heed_EDITED'),('PEGASIS','pegasis_EDITED'),('EECH-HEED+','eechheed_IMPROVED'),('LEACH','leach_EDITED'),('H-LEACH+','hleach_IMPROVED'),('SH-LEACH+','shleach_IMPROVED'),('v8','v8_center')]
fig,ax=plt.subplots(figsize=(9,4)); ax.grid(axis='x'); ax.grid(axis='y',visible=False)
vals=[v(r)[0] for _,r in fam]; ax.barh([n for n,_ in fam],vals,color=[GREY]*6+[BLUE],zorder=3)
base=v('v8_center')[0]
for i,val in enumerate(vals): ax.text(val+25,i,f'{val}'+('' if i==6 else f'   (v8 +{(base/val-1)*100:.0f}%)'),va='center',fontsize=10,color=INK)
ax.set_xlabel('FND — first node death (rounds)'); ax.set_xlim(0,3300)
save(fig,'c1_fnd_rank.png')


# ---------------- K1 demo packets (from the sink capture) ----------------
b=open(os.path.join(ROOT,'figures','demo','demo-clustered-wsn-12-0.pcap'),'rb').read(); o=24; rows=[]
while o<len(b) and len(rows)<14:
    ts,us,il,_=struct.unpack('<IIII',b[o:o+16]); o+=16; fr=b[o:o+il]; o+=il
    fcf=fr[0]|fr[1]<<8; ft=fcf&7; seq=fr[2]
    if ft==1: dst='0x%04x'%(fr[5]|fr[6]<<8); src='0x%04x'%(fr[7]|fr[8]<<8); rows.append([len(rows)+1,f'{ts+us/1e6:.4f}',src,dst,'Data',il,f'Seq {seq}, 40-byte reading, ACK requested'])
    elif ft==2: rows.append([len(rows)+1,f'{ts+us/1e6:.4f}','—','—','Ack',il,f'Ack for Seq {seq}'])
fig,ax=plt.subplots(figsize=(11,4.2)); ax.set_axis_off()
t=ax.table(cellText=rows,colLabels=['No.','Time (s)','Source','Destination','Type','Length','Info'],loc='center',cellLoc='left',colWidths=[0.05,0.1,0.1,0.12,0.07,0.08,0.4])
t.auto_set_font_size(False); t.set_fontsize(9.5); t.scale(1,1.35)
for (r_,c_),cell in t.get_celld().items():
    cell.set_edgecolor('#d9d8d2')
    if r_==0: cell.set_facecolor(NAVY); cell.get_text().set_color('white'); cell.get_text().set_fontweight('bold')
    elif rows[r_-1][4]=='Ack': cell.set_facecolor('#eef7f2')
    else: cell.set_facecolor('#eef3fb')
ax.set_title('IEEE 802.15.4 frames heard by the sink (demo capture, first 14 frames)',loc='left',fontsize=11,color=INK,fontweight='bold')
save(fig,'k1_packets.png')
print('done')

# ---------------- PDR charts ----------------
def pdr_bars(labels, runs, name, colors=None, lo=98.4, title=''):
    fig,ax=plt.subplots(figsize=(max(6,0.75*len(labels)+1.5),3.6)); vals=[v(r)[3] for r in runs]
    ax.bar(labels,vals,0.6,color=colors or [AQUA]*len(labels),zorder=3)
    for i,val in enumerate(vals): ax.text(i,val+0.03,f'{val:.2f}',ha='center',fontsize=9,color=INK)
    ax.set_ylim(lo,100.1); ax.set_ylabel('PDR (%)')
    if title: ax.set_title(title,loc='left',fontweight='bold',color=INK)
    save(fig,name)
pdr_bars(['LEACH','HEED','HEED+fair','PEGASIS'],['leach_EDITED','heed_EDITED','heed_fairness_EDITED','pegasis_EDITED'],'pdr_classic.png',title='PDR — classic protocols (EDITED)')
fig,ax=plt.subplots(figsize=(8,3.6)); x=np.arange(3); w=0.26
for j,(s,c) in enumerate([('ORIGINAL',GREY),('EDITED',ORANGE),('IMPROVED',BLUE)]):
    vals=[v(f'{k}_{s}')[3] for k in ('shleach','hleach','eechheed')]
    ax.bar(x+(j-1)*w,vals,w-0.03,color=c,zorder=3,label=s)
    for i,val in enumerate(vals): ax.text(x[i]+(j-1)*w,val+0.05,f'{val:.2f}',ha='center',fontsize=8,color=INK,rotation=90)
ax.set_xticks(x); ax.set_xticklabels(['SH-LEACH','H-LEACH','EECH-HEED']); ax.set_ylim(94.5,101.8); ax.set_ylabel('PDR (%)'); ax.legend(ncol=3,loc='upper center')
ax.set_title('PDR — hybrids',loc='left',fontweight='bold',color=INK); save(fig,'pdr_hybrids.png')
EV=[('v1','v1_heed_election_leach_join'),('v2','v2_fairness_penalty'),('v3','v3_single_pass_reuse_int5'),('v4','v4_reuse_int15'),('v5','v5_backup_int15'),('v5-exp','v5x_backup_repair_int5'),
    ('v5b','v5b_energy_aware_repair'),('v6','v6_chain_center'),('v7','v7_chain_backup_center'),('v7.1','v7_1_multihop_int5'),('v8','v8_center'),('v8-Chain','v8_chain_center')]
pdr_bars([a for a,_ in EV],[b for _,b in EV],'pdr_versions.png',colors=[AQUA]*10+[BLUE]*2,lo=95,title='PDR — every version of the proposed protocol')
print('pdr done')


# ---------------- Far-BS figures ----------------
FARS=[('LEACH','leach_EDITED'),('HEED','heed_EDITED'),('PEGASIS','pegasis_EDITED'),('SH-LEACH+','shleach_IMPROVED'),('H-LEACH+','hleach_IMPROVED'),('EECH-HEED+','eechheed_IMPROVED')]
fig,ax=plt.subplots(figsize=(11,4.2)); labs=[n for n,_ in FARS]+['v8','v8-Chain']
cen=[v(r)[0] for _,r in FARS]+[v('v8_center')[0],v('v8_chain_center')[0]]
far=[v(r+'_farBS')[0] for _,r in FARS]+[v('v8_farBS')[0],v('v8_chain_farBS')[0]]
x=np.arange(len(labs)); w=0.38
ax.bar(x-w/2,cen,w-0.03,color='#c9c8c2',zorder=3,label='BS at the centre (50, 50)')
ax.bar(x+w/2,far,w-0.03,color=[ORANGE]*6+[BLUE,BLUE],zorder=3,label='BS far away (50, −100)')
for i,(a,b) in enumerate(zip(cen,far)):
    ax.text(x[i]-w/2,a+25,str(a),ha='center',fontsize=8.5,color=MUTED); ax.text(x[i]+w/2,b+25,str(b),ha='center',fontsize=8.5,color=INK,fontweight='bold')
ax.set_xticks(x); ax.set_xticklabels(labs); ax.set_ylabel('FND (rounds)'); ax.set_ylim(0,2800); ax.legend(loc='upper left')
save(fig,'far_fnd.png')
fig,ax=plt.subplots(figsize=(9,4)); ax.grid(axis='x'); ax.grid(axis='y',visible=False)
rank=sorted([(n,v(r+'_farBS')[0]) for n,r in FARS]+[('v8',v('v8_farBS')[0]),('v8-Chain',v('v8_chain_farBS')[0])],key=lambda t:t[1])
ax.barh([n for n,_ in rank],[f for _,f in rank],color=[BLUE if n=='v8-Chain' else ('#8fb3e8' if n=='v8' else GREY) for n,_ in rank],zorder=3)
top=v('v8_chain_farBS')[0]
for i,(n,f) in enumerate(rank): ax.text(f+20,i,f'{f}'+('' if n=='v8-Chain' else f'   (v8-Chain +{(top/f-1)*100:.0f}%)'),va='center',fontsize=10,color=INK)
ax.set_xlabel('FND with the BS far away (rounds)'); ax.set_xlim(0,2300)
save(fig,'far_rank.png')

# ---------------- Equations (math style) ----------------
def eqimg(lines,name,fs=20,w=9):
    h=0.62*len(lines)+0.15
    fig=plt.figure(figsize=(w,h)); fig.patch.set_alpha(0)
    for i,l in enumerate(lines):
        fig.text(0.01,1-(i+0.55)/len(lines),l,fontsize=fs,color=INK,va='center',ha='left')
    fig.savefig(os.path.join(OUT,name),dpi=220,transparent=True,bbox_inches='tight',pad_inches=0.05); plt.close(fig)
plt.rcParams['mathtext.fontset']='cm'
eqimg([r'$E_{Tx}(k,d)=k\,E_{elec}+k\,\varepsilon_{fs}\,d^{2}\quad (d<d_{0})$',
       r'$E_{Tx}(k,d)=k\,E_{elec}+k\,\varepsilon_{mp}\,d^{4}\quad (d\geq d_{0})$',
       r'$E_{Rx}(k)=k\,E_{elec}$',
       r'$d_{0}=\sqrt{\varepsilon_{fs}/\varepsilon_{mp}}\approx 87.7\ \mathrm{m}$'],'eq_energy.png',fs=22,w=6.5)
eqimg([r'$T(n)=\dfrac{P}{1-P\,\left(r\ \mathrm{mod}\ \frac{1}{P}\right)}\quad \mathrm{if}\ n\in G,\qquad T(n)=0\ \ \mathrm{otherwise}$'],'eq_leach.png',w=10)
eqimg([r'$CH_{prob}=\max\!\left(C_{prob}\,\dfrac{E_{res}}{E_{max}},\ p_{min}\right),\qquad CH_{prob}\leftarrow\min(2\,CH_{prob},\,1)$'],'eq_heed.png',w=10)
eqimg([r'$\mathrm{leader}(i)=i\ \mathrm{mod}\ N$'],'eq_pegasis.png',w=5)
eqimg([r'$CH_{prob}=C_{prob}\,\dfrac{E_{res}}{E_{max}}\cdot\dfrac{C_{prob}\,r}{1+\left(CH_{cho}\ \mathrm{mod}\ \frac{1}{C_{prob}}\right)}$'],'eq_shleach.png',w=8)
eqimg([r'$e_{0}(i)=P\,\dfrac{E_{i}}{E_{max}},\qquad t(n)=\dfrac{e_{0}(i)}{1-e_{0}(i)\,\left(r\ \mathrm{mod}\ \mathrm{round}\!\left(\frac{1}{e_{0}(i)}\right)\right)},\qquad E_{i}>\bar{E}$'],'eq_hleach.png',w=12)
eqimg([r'$P_{z1}=C_{prob}\,\dfrac{E_{res}}{E_{avg}},\qquad P_{z2}=\dfrac{E}{E_{max}}\cdot\dfrac{D}{D_{max}},\qquad T=\dfrac{P}{1-P\,(r\ \mathrm{mod}\ \frac{1}{P})}\ \alpha\,\beta$'],'eq_eech.png',w=12)
eqimg([r'$\mathrm{score}(n)=T(r)\cdot\dfrac{E_{n}}{E_{0}}\cdot\left(1+\dfrac{deg_{n}}{deg_{max}}\right)$'],'eq_score.png',w=8)
eqimg([r'$\mathrm{relay\ via\ }j\ \ \Leftrightarrow\ \ E_{Tx}(c\to j)+E_{Rx}(j)+E_{DA}(j)\ <\ E_{Tx}(c\to BS)$'],'eq_relay.png',w=10)
eqimg([r'$\mathrm{SH\text{-}LEACH:}\quad r\ \longrightarrow\ \left((r-1)\ \mathrm{mod}\ \frac{1}{C_{prob}}\right)+1$',
       r'$\mathrm{H\text{-}LEACH:}\quad E_{i}>\bar{E}\ \longrightarrow\ E_{i}\geq\bar{E}\quad +\ G\text{-}\mathrm{set}$',
       r'$\mathrm{EECH\text{-}HEED\ (zone\ 2):}\quad \frac{1}{P}\ \longrightarrow\ \frac{1}{0.10}=10\ \mathrm{rounds}$'],'eq_fixes.png',w=9)
eqimg([r'$r\ \longrightarrow\ \left((r-1)\ \mathrm{mod}\ \frac{1}{C_{prob}}\right)+1$'],'eq_fix1.png',fs=24,w=6)
eqimg([r'$E_{i}>\bar{E}\ \longrightarrow\ E_{i}\geq\bar{E}\ \ +\ G\text{-}\mathrm{set}$'],'eq_fix2.png',fs=24,w=6)
eqimg([r'$\frac{1}{P_{z2}}\approx 1\ \longrightarrow\ \frac{1}{0.10}=10\ \mathrm{rounds}$'],'eq_fix3.png',fs=24,w=6)
print('far + eq done')

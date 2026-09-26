# Security figures (thesis-proposal scheme) and the Wireshark frame decode.
# Run after make_figures2.py:  python3 make_figures3.py
import csv, os
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch
import numpy as np
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..','..'); R=os.path.join(ROOT,'results'); OUT=os.path.join(HERE,'fig')
BLUE,ORANGE,AQUA,RED,GOLD='#2a78d6','#eb6834','#1baf7a','#e34948','#f2c200'; GREY='#9a9a96'; INK='#1f1f1d'; MUTED='#6b6a66'; GRID='#e6e5e0'; NAVY='#14213d'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.edgecolor':'#c9c8c2','axes.labelcolor':INK,
  'xtick.color':MUTED,'ytick.color':MUTED,'axes.spines.top':False,'axes.spines.right':False,'axes.grid':True,'axes.grid.axis':'y',
  'grid.color':GRID,'grid.linewidth':0.8,'axes.axisbelow':True,'savefig.dpi':200,'legend.frameon':False})
S={r['run']:r for r in csv.DictReader(open(os.path.join(R,'summary_all.csv')))}
def sec(p,bs,s): r=S[f'sec_{p}_{bs}_{s}']; return int(r['FND']),float(r['PDR'])*100
def save(fig,name): fig.savefig(os.path.join(OUT,name),bbox_inches='tight',facecolor='white'); plt.close(fig)
def blank(w,h):
    fig,ax=plt.subplots(figsize=(w,h)); ax.set_axis_off(); ax.set_xlim(0,w); ax.set_ylim(0,h); ax.set_aspect('equal'); return fig,ax
def box(ax,x,y,w,h,text,fc,ec=None,fs=11,tc=INK,bold=False):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0.02,rounding_size=0.12',fc=fc,ec=ec or fc,lw=1.5))
    ax.text(x+w/2,y+h/2,text,ha='center',va='center',fontsize=fs,color=tc,fontweight='bold' if bold else 'normal')
def arrow(ax,a,b,c=MUTED,lw=1.8,ls='-',ms=16):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=ms,color=c,lw=lw,linestyle=ls,shrinkA=4,shrinkB=4))

SC=[('s0_none','No\nsecurity'),('s1_aes_only','AES + MIC\nonly'),('s6_once_rsa','Hybrid\nRSA once'),('s7_once_ecc','Hybrid\nECC once'),
    ('s2_hybrid_rsa','Hybrid\nRSA per CH'),('s3_hybrid_ecc','Hybrid\nECC per CH'),('s8_bs_ecc','ECC on\nCH→sink'),('s9_bs_rsa','RSA on\nCH→sink'),('s4_full_ecc','Full\nECC'),('s5_full_rsa','Full\nRSA')]

# ---------------- S2 FND per scheme (centre / far) ----------------
for bs,v8k,v8lab,name in [('center','v8','v8','s2_sec_center.png'),('far','v8chain','v8-Chain','s2_sec_far.png')]:
    fig,ax=plt.subplots(figsize=(12.5,4.4)); x=np.arange(len(SC)); w=0.27
    for j,(p,lab,c) in enumerate([('leach','LEACH',GREY),('pegasis','PEGASIS',AQUA),(v8k,v8lab,BLUE)]):
        vals=[sec(p,bs,s)[0] for s,_ in SC]
        ax.bar(x+(j-1)*w,vals,w-0.03,color=c,zorder=3,label=lab)
        for i,val in enumerate(vals): ax.text(x[i]+(j-1)*w,val+30,str(val),ha='center',fontsize=7.5,color=INK,rotation=90)
    ax.axvspan(1.5,3.5,color='#e8f6ef',zorder=0); ax.text(2.5,2950 if bs=='center' else 2000,'recommended',ha='center',color=AQUA,fontsize=10,fontweight='bold')
    ax.axvspan(7.5,9.5,color='#fdeceb',zorder=0); ax.text(8.5,2950 if bs=='center' else 2000,'network breaks',ha='center',color=RED,fontsize=10,fontweight='bold')
    ax.set_xticks(x); ax.set_xticklabels([l for _,l in SC],fontsize=9.5); ax.set_ylabel('FND (rounds)')
    ax.set_ylim(0,3200 if bs=='center' else 2200); ax.legend(loc='upper center',ncol=3,fontsize=10,bbox_to_anchor=(0.6,0.97))
    save(fig,name)

# ---------------- S3 PDR per scheme ----------------
fig,ax=plt.subplots(figsize=(12.5,3.6)); x=np.arange(len(SC)); w=0.27
for j,(p,lab,c) in enumerate([('leach','LEACH',GREY),('pegasis','PEGASIS',AQUA),('v8','v8',BLUE)]):
    vals=[sec(p,'center',s)[1] for s,_ in SC]
    ax.bar(x+(j-1)*w,vals,w-0.03,color=c,zorder=3,label=lab)
    for i,val in enumerate(vals): ax.text(x[i]+(j-1)*w,val+1.5,f'{val:.0f}',ha='center',fontsize=8,color=INK)
ax.set_xticks(x); ax.set_xticklabels([l for _,l in SC],fontsize=9.5); ax.set_ylabel('PDR (%)'); ax.set_ylim(0,112)
ax.legend(loc='upper right',ncol=3,fontsize=10,bbox_to_anchor=(1,1.12)); save(fig,'s3_sec_pdr.png')

# ---------------- S4 the proposed hybrid scheme ----------------
fig,ax=blank(12,5.2)
ax.add_patch(FancyBboxPatch((0.3,0.4),5.6,4.3,boxstyle='round,pad=0.02,rounding_size=0.2',fc='#eef4fc',ec='#c9d4e8',lw=1.5))
ax.text(3.1,4.4,'Inside the cluster: AES + MIC',ha='center',fontsize=12,color=BLUE,fontweight='bold')
ch=(4.6,2.5); ax.add_patch(Circle(ch,0.38,color=RED,zorder=3)); ax.text(ch[0],ch[1],'CH',ha='center',va='center',color='white',fontweight='bold',zorder=4)
for p in [(1.1,3.6),(1.0,1.2),(2.2,2.4),(2.6,3.9),(2.7,0.9),(1.6,2.0)]:
    ax.add_patch(Circle(p,0.17,color=BLUE,zorder=3)); arrow(ax,p,ch,c=BLUE,lw=1.4,ms=12)
ax.text(3.1,0.6,'members: AES reading + 8-byte MIC (+104 bits)',ha='center',fontsize=9.5,color=MUTED)
sink=(10.6,2.5); ax.add_patch(FancyBboxPatch((9.6,1.6),2.0,1.8,boxstyle='round,pad=0.02,rounding_size=0.15',fc=GOLD,ec=GOLD))
ax.text(sink[0],2.75,'SINK',ha='center',fontsize=14,fontweight='bold',color=INK); ax.text(sink[0],2.2,'mains-powered\nheavy key ops here',ha='center',fontsize=8.5,color=INK)
arrow(ax,(5.05,2.95),(9.55,2.95),c=ORANGE,lw=2.2); ax.text(7.3,3.2,'1  authenticate (public key, once)',ha='center',fontsize=10,color=ORANGE,fontweight='bold')
arrow(ax,(9.55,2.5),(5.05,2.5),c=NAVY,lw=2.0,ls='--'); ax.text(7.3,2.15,'2  credentials / session key',ha='center',fontsize=10,color=NAVY)
arrow(ax,(5.05,1.95),(9.55,1.95),c=AQUA,lw=2.2); ax.text(7.3,1.55,'3  fused data (AES + MIC)',ha='center',fontsize=10,color=AQUA,fontweight='bold')
ax.text(8.6,4.3,'CH ↔ sink: public key only\nfor authentication',ha='center',va='center',fontsize=12,color=ORANGE,fontweight='bold')
save(fig,'s4_sec_scheme.png')

# ---------------- S5 cost of one operation (log scale) ----------------
ops=[('AES, one 2000-bit packet',10e-3),('RSA-1024 encrypt\n(public key)',11.9),('RSA key transport,\nnode side',15.4),('ECDH-160\nkey agreement',22.3),('RSA-1024 decrypt\n(private key)',304),('RSA: decrypt one\n2000-bit reading (3 blocks)',912)]
fig,ax=plt.subplots(figsize=(11,3.9)); y=np.arange(len(ops))
cols=[AQUA,ORANGE,ORANGE,ORANGE,RED,RED]
ax.barh(y,[v for _,v in ops],color=cols,zorder=3); ax.set_xscale('log'); ax.set_yticks(y); ax.set_yticklabels([l for l,_ in ops],fontsize=9.5); ax.invert_yaxis()
ax.axvline(500,color=NAVY,ls='--',lw=1.4); ax.text(520,-0.35,'whole battery\n0.5 J = 500 mJ',color=NAVY,fontsize=9,va='top')
for i,(_,v) in enumerate(ops): ax.text(v*1.15,i,(f'{v*1000:.0f} µJ' if v<1 else f'{v:g} mJ'),va='center',fontsize=9.5)
ax.set_xlabel('energy (mJ, log scale)'); ax.grid(axis='x',color=GRID); ax.grid(axis='y',visible=False); ax.set_xlim(3e-3,5000)
save(fig,'s5_sec_ops.png')

# ---------------- K2 Wireshark frame decode (31-byte WSN-Day3 data frame) ----------------
fields=[('61 98','Frame Control','0x9861: Data,\nACK requested,\n16-bit addresses',BLUE,3),
        ('a8','Seq.','168',ORANGE,1.6),('00 00','PAN ID','0x0000',AQUA,2),('04 00','Destination','0x0004 = sink',RED,2),
        ('01 00','Source','0x0001 = node 0',GOLD,2),('00 … 00','Payload','20 bytes (the reading)',GREY,4.5),('d3 48','FCS','CRC-16\n(checked = good)',NAVY,2)]
fig,ax=blank(13,3.3); x=0.2; unit=12.6/17.1
for hx,name,val,c,n in fields:
    w=n*unit; box(ax,x,1.9,w-0.08,0.8,hx,c,fs=12,tc='white' if c not in (GOLD,) else INK,bold=True)
    ax.text(x+w/2-0.04,1.62,name,ha='center',va='top',fontsize=10.5,fontweight='bold',color=INK)
    ax.text(x+w/2-0.04,1.25,val,ha='center',va='top',fontsize=8.5,color=MUTED); x+=w
ax.text(0.2,3.05,'9 header bytes  +  20 payload bytes  +  2 FCS bytes  =  31 bytes  (the ACK = 2 + 1 + 2 = 5 bytes)',fontsize=12,color=INK,fontweight='bold')
save(fig,'k2_frame_decode.png')

# ---------------- security equation ----------------
plt.rcParams['mathtext.fontset']='cm'
def eqimg(lines,name,fs=20,w=9):
    h=0.62*len(lines)+0.15
    fig=plt.figure(figsize=(w,h)); fig.patch.set_alpha(0)
    for i,l in enumerate(lines): fig.text(0.01,1-(i+0.55)/len(lines),l,fontsize=fs,color=INK,va='center',ha='left')
    fig.savefig(os.path.join(OUT,name),dpi=220,transparent=True,bbox_inches='tight',pad_inches=0.05); plt.close(fig)
eqimg([r"$k'=k+104\ \mathrm{bits}\qquad E^{sec}_{Tx}=E_{Tx}(k',d)+k'\,E_{sym}+E_{pk}$",
       r"$E^{sec}_{Rx}=E_{Rx}(k')+k'\,E_{sym}+E_{pk}^{\prime}\qquad E_{CH}\leftarrow E_{CH}-E_{auth}\ \ (\mathrm{new\ CH})$"],'eq_security.png',fs=21,w=10)
print('ok')

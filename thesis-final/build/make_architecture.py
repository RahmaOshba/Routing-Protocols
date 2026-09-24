# Architecture design of the proposed protocol (v8-Chain), drawn box by box
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'fig')
INK='#1f1f1d'; MUTED='#52514e'
fig,ax=plt.subplots(figsize=(15,8.6)); ax.set_xlim(0,150); ax.set_ylim(0,84); ax.axis('off')
def panel(x,y,w,h,title,sub,edge,fill):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0,rounding_size=2',fc=fill,ec=edge,lw=2))
    ax.text(x+2,y+h-1.8,title,fontsize=14,fontweight='bold',color=edge,va='top')
    ax.text(x+w-2,y+h-2.0,sub,fontsize=11,color=MUTED,va='top',ha='right',style='italic')
def box(x,y,w,h,title,body,ec='#c9c8c2',fc='white',tag=None):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle='round,pad=0,rounding_size=1.4',fc=fc,ec=ec,lw=1.4))
    ax.text(x+w/2,y+h-2.4,title,ha='center',va='top',fontsize=11.5,fontweight='bold',color=INK)
    ax.text(x+w/2,y+h/2-2.2,body,ha='center',va='center',fontsize=9.3,color=MUTED,linespacing=1.3)
    if tag:
        ax.text(x+w-1.5,y+h,tag,ha='right',va='center',fontsize=8.5,fontweight='bold',color='white',
                bbox=dict(boxstyle='round,pad=0.25',fc=ec,ec=ec))
def arrow(a,b,color=MUTED,ls='-',rad=0,lw=1.6):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=16,color=color,lw=lw,ls=ls,connectionstyle=f'arc3,rad={rad}'))
BLUE,ORANGE,AQUA,RED='#2a78d6','#eb6834','#1baf7a','#e34948'
# ---- 1 setup
panel(3,57,144,25,'1 · SETUP PHASE','once every 5 rounds',BLUE,'#eef4fc')
W=25.5; xs=[6+i*(W+3) for i in range(5)]
S=[('Epoch check','new epoch early if\nnobody is eligible','I1'),('Energy gate','only nodes with\nE ≥ network average','I5'),
   ('Single-pass score','P = T(r) × (E/E0)\n× (1 + deg/deg_max)',None),('Advertise + join','nearest CH\njoin request · TDMA',None),('Backup CH','strongest member\nof every cluster',None)]
for x,(t,b,tag) in zip(xs,S): box(x,59.5,W,15,t,b,ec=BLUE if tag else '#c9c8c2',tag=tag)
for i in range(4): arrow((xs[i]+W,67),(xs[i+1],67))
# ---- 2 data
panel(3,30,120,25,'2 · DATA PHASE','every round — the clusters are reused',ORANGE,'#fdf2ec')
W2=25.5; xd=[6+i*(W2+3) for i in range(4)]
D=[('Proactive handover','a weak CH hands over\nbefore it dies','I2'),('Member → CH','or straight to the BS\nif it is closer','I4'),
   ('CH fuses','members + own signal\n→ one packet',None),('Energy-aware relay','via a CH closer to the BS\nonly if it costs less','Chain')]
for x,(t,b,tag) in zip(xd,D): box(x,32.5,W2,15,t,b,ec=ORANGE if tag else '#c9c8c2',tag=tag)
for i in range(3): arrow((xd[i]+W2,40),(xd[i+1],40))
# BS
ax.add_patch(FancyBboxPatch((127,33),20,14,boxstyle='round,pad=0,rounding_size=2',fc='#f2c200',ec='#8a6d00',lw=2))
ax.text(137,40,'BASE\nSTATION',ha='center',va='center',fontsize=13,fontweight='bold',color=INK)
arrow((xd[3]+W2,40),(127,40),color=INK,lw=2)
# setup -> data, loop back
arrow((20,59.5),(20,47.5),color=BLUE,lw=2.2)
ax.text(21.5,55.8,'clusters + backups',fontsize=10,color=BLUE,ha='left',va='center')
ax.annotate('',xy=(4.5,67),xytext=(4.5,40),arrowprops=dict(arrowstyle='-|>',color=BLUE,lw=1.6,ls='--',connectionstyle='arc3,rad=-0.5'))
ax.text(0.3,53.5,'after\n5 rounds',fontsize=9,color=BLUE,ha='center',va='center')
# ---- 3 fault (flow right -> left, under the data steps)
panel(3,3,120,25,'3 · FAULT TOLERANCE','',AQUA,'#ecf8f3')
box(90,5.5,30,15,'CH dies','energy exhausted\nduring the round',ec=RED,fc='#fff5f5')
box(48,5.5,36,15,'Promote the backup','if it has ≥ 5% of the average\nenergy + cluster / chain repair')
box(6,5.5,36,15,'Orphan re-join','members with no usable backup\njoin the nearest surviving CH',ec=AQUA,tag='I3')
arrow((90,13),(84,13)); arrow((48,13),(42,13))
ax.text(45,16.3,'no backup',fontsize=8.5,color=MUTED,ha='center')
arrow((xd[2]+W2/2+6,32.5),(105,20.5),color=RED,ls=':',lw=1.8)
arrow((62,20.5),(xd[1]+W2/2,32.5),color=AQUA,ls='--',lw=1.8)
ax.text(56,23.2,'the cluster keeps working',fontsize=9,color=AQUA,ha='right')
ax.text(100,23.6,'CH energy runs out',fontsize=9,color=RED,ha='left')
fig.savefig(os.path.join(OUT,'f12_architecture.png'),dpi=200,bbox_inches='tight',facecolor='white')
print('ok')

# Code

All files are ns-3.41 C++ programs using the analytical first-order radio model.
To run one, copy it into `ns-3.41/scratch/` and run `./ns3 run scratch/<name>`.
Each run writes `<name>-results.csv`, `<name>-node-energy.csv`,
`<name>-node-lifetime.csv` and a NetAnim file `<name>-clustering.xml`.
The results of every file are in `../results/<same folder>/<same name>/`.

| Folder | What it contains |
|---|---|
| `0_FIRST_EXPERIMENTS/` | First ns-3 tests (lr-wpan packet test, first WSN run, ns-3 template) |
| `1_ORIGINAL/` | Each published protocol in **its own paper's settings** (to validate the code) |
| `2_EDITED/` | The same algorithms in **one unified environment** (fair comparison) |
| `3_IMPROVED/` | The literature hybrids after **our fix** of their main flaw |
| `4_PROPOSED/` | **Our protocol**, version by version, v1 → v8-Chain |
| `archive/` | Superseded variants kept only for history (not used in the thesis) |

## Unified environment (2_EDITED, 3_IMPROVED, 4_PROPOSED)

| Setting | Value |
|---|---|
| Nodes | 100 in a 100 × 100 m field |
| Initial energy | 0.5 J per node (50 J in total) |
| BS | Centre (50, 50), and far (50, −100) for some runs |
| Radio | Two-slope: Eelec 50 nJ/bit, εfs 10 pJ/bit/m², εmp 0.0013 pJ/bit/m⁴ |
| Data aggregation | EDA 5 nJ/bit |
| Packets | 2000-bit data, 200-bit control |

Every protocol follows the same rules:

- **CH advertisement:** reaches every node that may join the CH. When any node in the field may join, it is sent over the field diagonal.
- **Setup messages:** a join request and a TDMA schedule are charged.
- **Fusion:** the CH fuses its members' signals plus its own (members + 1).
- **No CH:** a node without a CH at setup sends directly to the BS.
- **Run length:** each run lasts until the last node dies. LND is printed only if that really happened.

## 1_ORIGINAL / 2_EDITED / 3_IMPROVED

| Protocol | ORIGINAL | EDITED | IMPROVED |
|---|---|---|---|
| LEACH | `leach_ORIGINAL` | `leach_EDITED` | — |
| HEED | `heed_ORIGINAL` | `heed_EDITED`, `heed_fairness_EDITED` (+ rotation-fairness penalty) | — |
| PEGASIS | `pegasis_ORIGINAL` | `pegasis_EDITED` | — |
| SH-LEACH | `shleach_ORIGINAL` | `shleach_EDITED` | `shleach_IMPROVED`: the round factor in Eq. 3 is made periodic (r mod 1/Cprob) |
| H-LEACH | `hleach_ORIGINAL` | `hleach_EDITED` | `hleach_IMPROVED`: ≥ average instead of > (no deadlock) + LEACH G-set |
| EECH-HEED | `eechheed_ORIGINAL` | `eechheed_EDITED` | `eechheed_IMPROVED`: Zone-2 rotation at the paper's 10% CH target |

## 4_PROPOSED — our protocol, step by step

Each version changes **one** thing, so its effect can be measured on its own.

| File | Thesis name | What it does | Difference from the previous version |
|---|---|---|---|
| `v1_heed_election_leach_join` | v1 | HEED election (iterative doubling, cost-based competition) + LEACH join (nearest CH) | Starting point |
| `v2_fairness_penalty` | v2 | v1 + rotation-fairness penalty: cost × (1 + 0.1·timesServed) | Fairer CH rotation |
| `v3_single_pass_reuse_int5` | v3 | **Single-pass** score (E/E0)·(1 + degree/maxDegree) × LEACH threshold; clusters are **reused for 5 rounds** | Removes HEED's per-round negotiation cost (main lifetime jump) |
| `v4_reuse_int15` | v4 | Same as v3, re-cluster every 15 rounds | Tests a longer interval |
| `v5_backup_int15` | v5 | v4 + **backup CH**: highest-energy member takes over when the CH dies | Fewer orphaned members |
| `v5x_backup_repair_int5` | v5-exp (Int 5) | Backup + **cluster repair**, interval 5 | Interval back to 5 |
| `v5x_backup_repair_int10` | v5-exp (Int 10) | Same, interval 10 | Interval test |
| `v5b_energy_aware_repair` | v5b | v5-exp (Int 5) + backup only if it has ≥ 5% of E0 | Rejects weak backups |
| `v6_chain_center` / `v6_chain_farBS` | v6 | CHs form an **ordered chain** to the BS (no backup) | Tests CH-to-CH forwarding |
| `v7_chain_backup_center` / `v7_chain_backup_farBS` | v7 | Chain + backup + **chain repair** | Chain survives CH deaths |
| `v7_1_multihop_int5` | v7.1 | **Greedy multihop tree**: each CH forwards to the nearest CH closer to the BS | No single gateway |
| `v7_2_multihop_int10` | v7.2 | Same, interval 10 | Interval test |
| `v8_center` / `v8_farBS` | v8 | v5b + **I1–I5** (see below) + low-energy test relative to the live average | Main lifetime / PDR gain |
| `v8_chain_center` / `v8_chain_farBS` | **v8-Chain (final)** | v8 + **energy-aware relay**: a CH forwards to another CH only if that costs less energy than going straight to the BS | Helps when the BS is far |
| `side_experiments/v7_backup_only_noChain_int10` | — | Backup only, no chain, interval 10 | Side test |

v8 improvements (switch one off with `-DI1=0` … `-DI5=0`):

- **I1 epoch-exhaustion fix:** start a new epoch early when nobody is eligible, so there are no zero-CH rounds.
- **I2 proactive handover:** a CH that cannot afford this round hands its role to its strongest member before it dies.
- **I3 orphan re-join:** members of a dead CH join the nearest surviving CH.
- **I4 direct-to-BS:** a node that is no farther from the BS than from its CH sends straight to the BS.
- **I5 energy-gated election:** only nodes with energy ≥ the network average may become CH.

`v8_chain_*` also takes `-DCHAIN_MODE=0` (direct, which equals v8), `1` (ordered chain) or `2` (energy-aware relay, the default).
`v5b` and all v8 files take `-DTOPO_SEED=<n>` for the 8-topology robustness runs.
The EDITED and IMPROVED codes, v3 and v5b take `-DBS_Y=-100` for the far-BS runs (default 50 = centre). Results: `results/far_bs/`.
`v8_chain_*` also take `-DSEC_BITS=<bits>`, `-DSEC_NJ_PER_BIT=<nJ>` and `-DSEC_SETUP_MJ=<mJ>` (all 0 by default) to estimate the energy cost of adding security (extra header/MIC bits, cipher energy per bit, one-time key setup). Results: `results/4_PROPOSED/extra/security/`.

### Fixes made in this revision

1. **Unified environment.** From v3 onwards, the CH advertisement was charged at 25 m, although every node in the field heard it and could join that CH. It is now sent over the field diagonal, as in the baselines. Join request + TDMA schedule are now charged (v1–v8). The CH now fuses members + 1 (v1–v8). The v8 handover message now has to reach the farthest member.
2. **Names.**
   - `hybrid-v6-optimized.cc` was really **v8**; it is now `v8_center.cc`.
   - The missing far-BS v8 file was added as `v8_farBS.cc`.
   - `hybrid_v8_interval5_combined.cc` was an exact copy of v5b and was removed.
   - The v8-Chain comments still said "v6"; they now say "v8".
   - All files now follow the version name used in the thesis, and their output files carry the same name.
3. **Stale header text.** v4's header quoted numbers from old, since-corrected codes (EECH-HEED 3808, PEGASIS 2887); it now describes the actual reason for the test.
4. **Old-environment variants.** These were moved to `archive/`:
   - v3/v6/v7 with the BS at (25, −100) in a 50 × 50 m field;
   - the v6 centre variant without the zero-CH fix;
   - the old packet-visualisation versions of LEACH and HEED.

## archive/ and 0_FIRST_EXPERIMENTS/

| File | What it is |
|---|---|
| `archive/v3_old_farBS_25_-100`, `v6_old_farBS_25_-100`, `v7_old_farBS_25_-100` | Early far-BS tests (50 × 50 m, BS at (25, −100)); replaced by the `*_farBS` files at (50, −100) |
| `archive/v6_old_center_no_zeroCH_fix` | First centre-BS v6; replaced by `v6_chain_center` (which has the zero-CH fix) |
| `archive/leach_old_with_packets`, `modified_heed_old_with_packets` | Old versions with a WiFi packet-animation layer; replaced by `1_ORIGINAL` / `2_EDITED` |
| `0_FIRST_EXPERIMENTS/demo_clustered_wsn` | **Demo** (prints every packet; one Wireshark `.pcap` per node, `--pcap=0` to turn off) — 12 sensors in 3 clusters + sink over real IEEE 802.15.4 (lr-wpan) packets: CH rotation, TDMA slots, fused packets to the sink, energy model and NetAnim packet animation (`./ns3 run "scratch/demo_clustered_wsn --rounds=6"`, open `demo-clustered-wsn.xml`). Tested on ns-3.41: 72/72 readings delivered in 18 packets |
| `0_FIRST_EXPERIMENTS/WSN-Day3_first_lrwpan_experiment` | First experiment: 3 sensors + sink over IEEE 802.15.4 (lr-wpan) |
| `0_FIRST_EXPERIMENTS/wsn_first_packet` | First WSN run with energy models and packet statistics (fixed: it crashed at exit because the energy-source container was a global object) |
| `0_FIRST_EXPERIMENTS/scratch_simulator_template` | The empty ns-3 scratch template |

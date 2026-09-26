# Simulation results

Every folder here matches a code file in `code/` with the same name. Each one holds:

- `summary.txt` — the final console output (FND / HND / LND / PDR, energy, packets)
- `results.csv` — one row per round (alive nodes, CHs, packets, energy, delay, PDR)
- `node_lifetime.csv` — the round in which every node died
- `node_positions.csv` — the node layout (last row = BS)

All numbers come from the analytical ns-3.41 model, seed 12345, run until the last node dies (LND is only reported if it really happened).

Overheads charged in the unified environment (EDITED, IMPROVED, PROPOSED): CH advertisement, join and TDMA messages; neighbour discovery (one HELLO per node at deployment) for every protocol that uses neighbour information (HEED, EECH-HEED, v1 → v8); for v8 / v8-Chain the 16-bit residual-energy field in every data packet and the BS beacon with the average energy at every set-up.

## 1 · ORIGINAL — each paper in its own settings

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `eechheed_ORIGINAL` | 1121 | 1954 | 3783 | 99.78% |
| `heed_ORIGINAL` | 734 | 1384 | 2259 | 99.80% |
| `hleach_ORIGINAL` | 1078 | 1157 | 1207 | 95.04% |
| `leach_ORIGINAL` | 1035 | 1152 | 1327 | 98.62% |
| `pegasis_ORIGINAL` | 1616 | 2017 | 2186 | 98.86% |
| `shleach_ORIGINAL` | 484 | 583 | 689 | 99.66% |

## 2 · EDITED — same algorithms in the unified environment

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `eechheed_EDITED` | 1277 | 1384 | 1543 | 99.49% |
| `heed_EDITED` | 658 | 1197 | 1875 | 99.65% |
| `heed_fairness_EDITED` | 738 | 1157 | 1969 | 99.67% |
| `hleach_EDITED` | 1384 | 1419 | 1434 | 99.30% |
| `leach_EDITED` | 1383 | 1586 | 1842 | 99.40% |
| `pegasis_EDITED` | 1324 | 2352 | 3504 | 99.42% |
| `shleach_EDITED` | 647 | 702 | 721 | 98.58% |

## 3 · IMPROVED — literature hybrids after our fix

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `eechheed_IMPROVED` | 1335 | 1384 | 1766 | 99.62% |
| `hleach_IMPROVED` | 1473 | 1509 | 1525 | 99.36% |
| `shleach_IMPROVED` | 1480 | 1542 | 1558 | 99.21% |

## 4 · PROPOSED — our protocol, v1 → v8-Chain

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `v1_heed_election_leach_join` | 320 | 529 | 1218 | 99.76% |
| `v2_fairness_penalty` | 334 | 528 | 1285 | 99.77% |
| `v3_single_pass_reuse_int5` | 1645 | 2001 | 2203 | 98.35% |
| `v4_reuse_int15` | 1513 | 2158 | 2416 | 97.07% |
| `v5_backup_int15` | 1513 | 2116 | 2356 | 98.44% |
| `v5x_backup_repair_int5` | 1645 | 1996 | 2081 | 98.95% |
| `v5x_backup_repair_int10` | 1540 | 2090 | 2259 | 98.70% |
| `v5b_energy_aware_repair` | 1645 | 1996 | 2116 | 98.62% |
| `v6_chain_center` | 1521 | 1913 | 2025 | 98.51% |
| `v6_chain_farBS` | 1481 | 1816 | 1961 | 97.95% |
| `v7_chain_backup_center` | 1521 | 1906 | 2011 | 98.91% |
| `v7_chain_backup_farBS` | 1481 | 1796 | 1911 | 98.80% |
| `v7_1_multihop_int5` | 1466 | 1896 | 2011 | 99.08% |
| `v7_2_multihop_int10` | 1431 | 1996 | 2181 | 98.43% |
| `v8_center` | 2446 | 2536 | 2566 | 99.72% |
| `v8_farBS` | 1406 | 1551 | 1606 | 99.38% |
| `v8_chain_center` | 2446 | 2536 | 2566 | 99.72% |
| `v8_chain_farBS` | 1626 | 1821 | 1881 | 99.56% |

Side experiment (not part of the main line):

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `side_experiments/v7_backup_only_noChain_int10` | 1540 | 2090 | 2291 | 98.58% |

## v8 ablation (center BS) — `v8_center.cc` compiled with `-DI<k>=0`

| Run | Removed mechanism | FND | HND | LND | PDR |
|---|---|---:|---:|---:|---:|
| v8 (full) | — | 2446 | 2536 | 2566 | 99.72% |
| v8 − I1 | I1 epoch-exhaustion fix | 2451 | 2541 | 2581 | 99.74% |
| v8 − I2 | I2 proactive CH handover | 2430 | 2535 | 2581 | 99.63% |
| v8 − I3 | I3 orphan re-join | 2446 | 2536 | 2566 | 99.71% |
| v8 − I4 | I4 direct-to-BS | 1766 | 1916 | 1981 | 99.54% |
| v8 − I5 | I5 energy-gated election | 2171 | 2481 | 2551 | 99.77% |

## CH→BS routing mode — `v8_chain_center.cc` with `-DCHAIN_MODE=0/1/2`

| Mode | BS | FND | HND | LND | PDR |
|---|---|---:|---:|---:|---:|
| 0 · direct CH→BS (= v8) | Center (50,50) | 2446 | 2536 | 2566 | 99.72% |
| 1 · ordered CH chain | Center (50,50) | 2381 | 2486 | 2521 | 99.68% |
| 2 · energy-aware relay (= v8-Chain) | Center (50,50) | 2446 | 2536 | 2566 | 99.72% |
| 0 · direct CH→BS (= v8) | Far (50,−100) | 1406 | 1551 | 1606 | 99.38% |
| 1 · ordered CH chain | Far (50,−100) | 1586 | 1801 | 1866 | 99.58% |
| 2 · energy-aware relay (= v8-Chain) | Far (50,−100) | 1626 | 1821 | 1881 | 99.56% |

## Robustness — 8 random topologies (seeds 12345, 1, 7, 42, 99, 2024, 31337, 555)

| Code | Mean FND | Mean HND | Mean LND | Mean PDR | FND min–max |
|---|---:|---:|---:|---:|---|
| v5b_center | 1606 | 2036 | 2238 | 98.37% | 1410–1743 |
| v8_center | 2448 | 2544 | 2581 | 99.71% | 2401–2481 |
| v8_chain_center | 2448 | 2544 | 2582 | 99.71% | 2401–2481 |
| v8_farBS | 1412 | 1604 | 1650 | 99.37% | 1346–1476 |
| v8_chain_farBS | 1652 | 1850 | 1898 | 99.46% | 1596–1681 |

## Security as planned in the thesis proposal — LEACH, PEGASIS and v8 / v8-Chain

Codes: `leach_EDITED.cc`, `pegasis_EDITED.cc`, `v8_chain_center.cc`, `v8_chain_farBS.cc` with
`-DSEC_BITS -DSEC_NJ_PER_BIT -DSEC_SETUP_MJ -DSEC_AUTH_MJ -DSEC_PK_TX_MJ -DSEC_PK_RX_MJ -DSEC_PK_BS_MJ -DSEC_KEYDIST` (all 0 by default).
Proposal: symmetric keys inside the cluster, public-key cryptography only between the CH and the sink,
the sink authenticates the CHs and gives them credentials; compare with no security and with full RSA.

Proposed ECC + AES scheme (standard algorithms only): ECDH once per node with the sink (X25519 RFC 7748, or P-256
NIST SP 800-56A / SP 800-186) → HKDF (RFC 5869) → per-node AES-128 key; every frame AES-128-CCM* with MIC-64 and frame
counter (IEEE 802.15.4-2020, NIST SP 800-38C); a new CH authenticates with AES-CMAC (SP 800-38B); the sink sends each node
the new cluster key with AES Key Wrap (SP 800-38F) = one extra control frame per node per set-up (`-DSEC_KEYDIST=1`).

Energy (ATmega128, 8 MHz): ECDH secp160r1 22.3 mJ, ECDSA-160 sign 22.82 mJ, RSA-1024 public op 11.9 mJ, private op 304 mJ,
RSA key transport node side 15.4 mJ (Wander et al., PerCom 2005). X25519 ≈ 48 mJ (13.9 M cycles, Düll et al. 2015, at
≈ 27.5 mW); P-256 ≈ 90 mJ (extrapolated from the P-224 timing of Gura et al., CHES 2004); RSA-3072 key transport
on the node ≈ 139 mJ (RSA-1024 15.4 mJ × 9, public-key cost grows with the square of the key size). AES-128 5 nJ/bit = hardware
AES of the 802.15.4 radio (assumed); 50 nJ/bit as a software-AES sensitivity case. Header + MIC-64 = 104 bits.
Full RSA: a 2000-bit reading = 3 RSA-1024 blocks = 3072 bits, 35.7 mJ to encrypt, 912 mJ to decrypt. ECIES ≈ 22.3 mJ.
The v8 column uses the v8-Chain code: at the centre it is identical to v8 unless the packets to the sink carry a
public-key cost — then the energy-aware relay (and the direct-to-BS rule) count that cost and CHs relay to save it.
Folders: `4_PROPOSED/extra/security_proposal/` (summary in `summary.csv`).

**BS at the centre** — FND (PDR)

| Scenario | LEACH | PEGASIS | v8 |
|---|---:|---:|---:|
| No security | 1383 (99.4%) | 1324 (99.4%) | 2446 (99.7%) |
| AES-128-CCM* + MIC only (pre-loaded keys) | 1037 (99.1%) | 1196 (99.4%) | 2061 (99.8%) |
| **ECC + AES scheme: X25519 once + AES-128-CCM* + key distribution (recommended)** | 932 (99.0%) | 1081 (99.4%) | 1831 (99.7%) |
| ECC + AES scheme: P-256 once + AES-128-CCM* + key distribution | 845 (98.9%) | 981 (99.2%) | 1651 (99.7%) |
| Same scheme with RSA-3072 key transport (128-bit, ≈ 139 mJ once) | 728 (98.8%) | 863 (99.3%) | 1481 (99.7%) |
| ECC + AES scheme: secp160r1 once (80-bit) + AES-128-CCM* + key distribution | 971 (99.3%) | 1141 (99.3%) | 1931 (99.8%) |
| Same scheme with RSA-1024 key transport (80-bit, 15.4 mJ once) | 990 (99.4%) | 1158 (99.3%) | 1961 (99.8%) |
| ECC + AES scheme + ECDSA signature by every new CH | 281 (98.9%) | 760 (98.0%) | 991 (99.4%) |
| ECC + AES scheme, software AES (50 nJ/bit, sensitivity) | 557 (98.7%) | 785 (99.2%) | 1061 (99.6%) |
| ECC-160 once + AES (no key distribution) | 1017 (99.1%) | 1141 (99.3%) | 1966 (99.7%) |
| RSA-1024 once + AES | 1019 (99.2%) | 1158 (99.3%) | 2016 (99.8%) |
| ECC for every new CH + AES | 302 (98.1%) | 774 (97.7%) | 1101 (99.0%) |
| RSA for every new CH + AES | 395 (99.1%) | 874 (97.7%) | 1286 (99.1%) |
| AES in the cluster + ECC (ECIES) on every packet to the sink | 284 (97.0%) | 774 (97.7%) | 706 (96.7%) |
| AES in the cluster + RSA on every packet to the sink | 201 (95.3%) | 674 (94.5%) | 411 (95.3%) |
| Full ECC (every packet) | 1 (23.8%) | 11 (83.3%) | 2 (16.9%) |
| Full RSA (every packet) | 182 (5.5%) | 1 (2.9%) | 44 (5.9%) |

**BS far away (v8 column = v8-Chain)** — FND (PDR)

| Scenario | LEACH | PEGASIS | v8 |
|---|---:|---:|---:|
| No security | 988 (99.4%) | 1374 (99.1%) | 1626 (99.6%) |
| AES-128-CCM* + MIC only (pre-loaded keys) | 821 (98.8%) | 1237 (99.1%) | 1361 (99.4%) |
| **ECC + AES scheme: X25519 once + AES-128-CCM* + key distribution (recommended)** | 720 (99.0%) | 1118 (98.9%) | 1226 (99.6%) |
| ECC + AES scheme: P-256 once + AES-128-CCM* + key distribution | 648 (98.9%) | 1014 (98.8%) | 1051 (99.5%) |
| Same scheme with RSA-3072 key transport (128-bit, ≈ 139 mJ once) | 572 (99.0%) | 893 (98.9%) | 911 (99.3%) |
| ECC + AES scheme: secp160r1 once (80-bit) + AES-128-CCM* + key distribution | 764 (99.2%) | 1182 (99.1%) | 1281 (99.4%) |
| Same scheme with RSA-1024 key transport (80-bit, 15.4 mJ once) | 765 (99.0%) | 1199 (99.0%) | 1336 (99.5%) |
| ECC + AES scheme + ECDSA signature by every new CH | 262 (99.3%) | 774 (96.5%) | 796 (97.2%) |
| ECC + AES scheme, software AES (50 nJ/bit, sensitivity) | 504 (98.4%) | 804 (98.6%) | 661 (99.3%) |
| ECC-160 once + AES (no key distribution) | 786 (99.2%) | 1182 (99.1%) | 1286 (99.6%) |
| RSA-1024 once + AES | 798 (99.1%) | 1199 (99.0%) | 1316 (99.5%) |
| ECC for every new CH + AES | 281 (98.8%) | 796 (96.8%) | 841 (96.1%) |
| RSA for every new CH + AES | 351 (98.8%) | 894 (97.3%) | 946 (98.0%) |
| AES in the cluster + ECC (ECIES) on every packet to the sink | 264 (95.8%) | 796 (96.8%) | 661 (96.1%) |
| AES in the cluster + RSA on every packet to the sink | 181 (94.2%) | 674 (95.9%) | 346 (94.9%) |
| Full ECC (every packet) | 1 (21.9%) | 11 (83.1%) | 1 (14.9%) |
| Full RSA (every packet) | 161 (5.3%) | 1 (3.4%) | 199 (4.0%) |

## Far base station — every protocol with the BS at (50, −100)

Same codes compiled with `-DBS_Y=-100` (folders `far_bs/`). v8 and v8-Chain use their own `*_farBS` files.

| Protocol | FND centre | FND far | HND far | LND far | PDR far |
|---|---:|---:|---:|---:|---:|
| LEACH | 1383 | 988 | 1230 | 1652 | 99.43% |
| HEED | 658 | 350 | 765 | 1375 | 99.53% |
| HEED + fairness | 738 | 407 | 756 | 1386 | 99.49% |
| PEGASIS | 1324 | 1374 | 2176 | 2713 | 99.08% |
| SH-LEACH (EDITED) | 647 | 390 | 601 | 861 | 99.67% |
| SH-LEACH+ (IMPROVED) | 1480 | 1388 | 1435 | 1455 | 98.89% |
| H-LEACH (EDITED) | 1384 | 1121 | 1156 | 1174 | 98.03% |
| H-LEACH+ (IMPROVED) | 1473 | 1219 | 1262 | 1278 | 99.12% |
| EECH-HEED (EDITED) | 1277 | 970 | 1377 | 1400 | 99.52% |
| EECH-HEED+ (IMPROVED) | 1335 | 1410 | 1437 | 1457 | 99.18% |
| v3 | 1645 | 1161 | 1546 | 2902 | 98.09% |
| v5b | 1645 | 1161 | 1536 | 1905 | 98.80% |
| v8 | 2446 | 1406 | 1551 | 1606 | 99.38% |
| v8-Chain | 2446 | 1626 | 1821 | 1881 | 99.56% |

`summary_all.csv` has every run in one table.

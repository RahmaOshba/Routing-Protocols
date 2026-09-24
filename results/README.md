# Simulation results

Every folder here matches a code file in `code/` with the same name. Each one holds:

- `summary.txt` — the final console output (FND / HND / LND / PDR, energy, packets)
- `results.csv` — one row per round (alive nodes, CHs, packets, energy, delay, PDR)
- `node_lifetime.csv` — the round in which every node died
- `node_positions.csv` — the node layout (last row = BS)

All numbers come from the analytical ns-3.41 model, seed 12345, run until the last node dies (LND is only reported if it really happened).

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
| `eechheed_EDITED` | 1311 | 1382 | 1545 | 99.74% |
| `heed_EDITED` | 634 | 1216 | 1883 | 99.68% |
| `heed_fairness_EDITED` | 743 | 1154 | 1960 | 99.74% |
| `hleach_EDITED` | 1384 | 1419 | 1434 | 99.30% |
| `leach_EDITED` | 1383 | 1586 | 1842 | 99.40% |
| `pegasis_EDITED` | 1324 | 2352 | 3504 | 99.42% |
| `shleach_EDITED` | 647 | 702 | 721 | 98.58% |

## 3 · IMPROVED — literature hybrids after our fix

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `eechheed_IMPROVED` | 1368 | 1385 | 1767 | 99.51% |
| `hleach_IMPROVED` | 1473 | 1509 | 1525 | 99.36% |
| `shleach_IMPROVED` | 1480 | 1542 | 1558 | 99.21% |

## 4 · PROPOSED — our protocol, v1 → v8-Chain

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `v1_heed_election_leach_join` | 322 | 530 | 1217 | 99.75% |
| `v2_fairness_penalty` | 338 | 528 | 1276 | 99.64% |
| `v3_single_pass_reuse_int5` | 1645 | 2011 | 2205 | 98.21% |
| `v4_reuse_int15` | 1438 | 2206 | 2476 | 95.91% |
| `v5_backup_int15` | 1438 | 2131 | 2401 | 98.44% |
| `v5x_backup_repair_int5` | 1645 | 2006 | 2101 | 98.82% |
| `v5x_backup_repair_int10` | 1540 | 2091 | 2251 | 98.66% |
| `v5b_energy_aware_repair` | 1645 | 2011 | 2106 | 98.56% |
| `v6_chain_center` | 1415 | 1916 | 2016 | 98.75% |
| `v6_chain_farBS` | 1409 | 1824 | 1936 | 97.77% |
| `v7_chain_backup_center` | 1415 | 1911 | 2001 | 99.10% |
| `v7_chain_backup_farBS` | 1409 | 1801 | 1906 | 98.97% |
| `v7_1_multihop_int5` | 1471 | 1916 | 2006 | 99.07% |
| `v7_2_multihop_int10` | 1421 | 1991 | 2193 | 98.27% |
| `v8_center` | 2501 | 2589 | 2636 | 99.65% |
| `v8_farBS` | 1441 | 1596 | 1646 | 99.46% |
| `v8_chain_center` | 2501 | 2589 | 2631 | 99.64% |
| `v8_chain_farBS` | 1671 | 1851 | 1906 | 99.36% |

Side experiment (not part of the main line):

| Code | FND | HND | LND | PDR |
|---|---:|---:|---:|---:|
| `side_experiments/v7_backup_only_noChain_int10` | 1540 | 2090 | 2291 | 98.58% |

## v8 ablation (center BS) — `v8_center.cc` compiled with `-DI<k>=0`

| Run | Removed mechanism | FND | HND | LND | PDR |
|---|---|---:|---:|---:|---:|
| v8 (full) | — | 2501 | 2589 | 2636 | 99.65% |
| v8 − I1 | I1 epoch-exhaustion fix | 2501 | 2589 | 2636 | 99.65% |
| v8 − I2 | I2 proactive CH handover | 2496 | 2581 | 2641 | 99.66% |
| v8 − I3 | I3 orphan re-join | 2501 | 2586 | 2626 | 99.71% |
| v8 − I4 | I4 direct-to-BS | 1766 | 1946 | 2021 | 99.41% |
| v8 − I5 | I5 energy-gated election | 2106 | 2516 | 2616 | 99.71% |

## CH→BS routing mode — `v8_chain_center.cc` with `-DCHAIN_MODE=0/1/2`

| Mode | BS | FND | HND | LND | PDR |
|---|---|---:|---:|---:|---:|
| 0 · direct CH→BS (= v8) | Center (50,50) | 2501 | 2589 | 2636 | 99.65% |
| 1 · ordered CH chain | Center (50,50) | 2436 | 2531 | 2561 | 99.64% |
| 2 · energy-aware relay (= v8-Chain) | Center (50,50) | 2501 | 2589 | 2631 | 99.64% |
| 0 · direct CH→BS (= v8) | Far (50,−100) | 1441 | 1596 | 1646 | 99.46% |
| 1 · ordered CH chain | Far (50,−100) | 1636 | 1846 | 1891 | 99.45% |
| 2 · energy-aware relay (= v8-Chain) | Far (50,−100) | 1671 | 1851 | 1906 | 99.36% |

## Robustness — 8 random topologies (seeds 12345, 1, 7, 42, 99, 2024, 31337, 555)

| Code | Mean FND | Mean HND | Mean LND | Mean PDR | FND min–max |
|---|---:|---:|---:|---:|---|
| v5b_center | 1618 | 2041 | 2239 | 98.11% | 1431–1725 |
| v8_center | 2500 | 2595 | 2636 | 99.65% | 2471–2531 |
| v8_chain_center | 2500 | 2595 | 2638 | 99.63% | 2471–2531 |
| v8_farBS | 1443 | 1627 | 1679 | 99.36% | 1391–1481 |
| v8_chain_farBS | 1682 | 1872 | 1934 | 99.41% | 1641–1721 |

`summary_all.csv` has every run in one table.

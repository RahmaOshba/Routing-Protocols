# Research papers

The papers are grouped the same way as the code (`code/`) and the results (`results/`).

| Folder | Papers | Code that implements them |
|---|---|---|
| `1_ORIGINAL/` | LEACH, HEED, PEGASIS | `code/1_ORIGINAL`, `code/2_EDITED` |
| `2_HYBRID/` | SH-LEACH, H-LEACH | `code/1_ORIGINAL`, `code/2_EDITED`, `code/3_IMPROVED` |
| `3_RECENT/` | EECH-HEED, RL-ILEACH, DL-HEED, TLC-LEACH | EECH-HEED only: `code/*/eechheed_*` |

**About the PDF files.** This repository is public. Only open-access papers
(Creative Commons licence) may be stored here as PDF. For the IEEE / IJIBC
papers, only the citation and the DOI link are given. Put your own copies in
the matching folder on your computer if you need them.

---

## 1_ORIGINAL — the three basic protocols

| # | Paper | Link | PDF here? |
|---|---|---|---|
| [1] | W. R. Heinzelman, A. Chandrakasan, H. Balakrishnan, "Energy-Efficient Communication Protocol for Wireless Microsensor Networks" (**LEACH**), Proc. HICSS-33, 2000. | https://doi.org/10.1109/HICSS.2000.926982 | No (IEEE) |
| [2] | O. Younis, S. Fahmy, "HEED: A Hybrid, Energy-Efficient, Distributed Clustering Approach for Ad Hoc Sensor Networks" (**HEED**), IEEE Trans. Mobile Computing 3(4), 2004. | https://doi.org/10.1109/TMC.2004.41 | No (IEEE) |
| [3] | S. Lindsey, C. S. Raghavendra, "PEGASIS: Power-Efficient Gathering in Sensor Information Systems" (**PEGASIS**), Proc. IEEE Aerospace Conf., 2002. | https://doi.org/10.1109/AERO.2002.1035242 | No (IEEE) |

What each paper gives, and what our reproduction (`code/1_ORIGINAL`) gets:

| Protocol | Published | Ours (paper settings) |
|---|---|---|
| LEACH | FND 932, LND 1312 (0.5 J) | FND 1035, LND 1327 |
| HEED | graphs only | FND 734, HND 1384, LND 2259 (500 nodes) |
| PEGASIS | FND 1578, HND 2082, LND 2192 | FND 1616, HND 2017, LND 2186 |

## 2_HYBRID — the two LEACH + HEED hybrids

| # | Paper | Link | PDF here? |
|---|---|---|---|
| [4] | S. Shrestha, Y. M. Kim, K. Jung, J.-Y. Lee, "The Improved Energy Efficient LEACH Protocol Technology of Wireless Sensor Networks" (**SH-LEACH**), IJIBC 7(1):30–35, 2015. | https://doi.org/10.7236/IJIBC.2015.7.1.30 | No (licence not stated) |
| [5] | A. Razaque, M. Mudigulam, K. Gavini, F. Amsaad, M. Abdulgader, P. Krishna, "H-LEACH: Hybrid-Low Energy Adaptive Clustering Hierarchy for Wireless Sensor Networks" (**H-LEACH**), Proc. IEEE LISAT, 2016. | IEEE Xplore (search the title) | No (IEEE) |

- **SH-LEACH:** CH probability = Cprob × (E/Emax) × (Cprob·r) / (1 + CHcho mod 1/Cprob) (Eq. 3).
  - **Flaw:** r is never reset, so the probability keeps growing (about 29 CHs per round).
  - **Our fix:** r mod 1/Cprob.
- **H-LEACH:** LEACH threshold with P·E/Emax, and a node may be CH only if E > E_avg (Algorithm 1).
  - **Flaw:** with equal initial energy nobody is above the average, so the election deadlocks.
  - **Our fix:** ≥ instead of >, plus the LEACH G-set.

## 3_RECENT — recent related work (2024–2026)

| # | Paper | Link | Licence |
|---|---|---|---|
| [6] | S. Kaur, S. Kour, M. Singh, "EECH-HEED: an adaptive hybrid clustering protocol for energy efficient soil monitoring in heterogeneous wireless sensor networks", Scientific Reports 15, 35548, 2025. | https://doi.org/10.1038/s41598-025-19480-y | CC BY (open access) |
| [7] | H. H. El-Sayed, E. M. Abd-Elgaber, S. K. Refaay, "An intelligent reinforcement learning enhanced improved LEACH protocol for prolonging wireless sensor network lifetime" (**RL-ILEACH**), Scientific Reports, 2026. | https://doi.org/10.1038/s41598-026-65225-w | CC BY (open access) |
| [8] | A. Juwaied, L. Jackowska-Strumillo, "DL-HEED: A Deep Learning Approach to Energy-Efficient Clustering in Heterogeneous Wireless Sensor Networks", Applied Sciences 15(16), 8996, 2025. | https://doi.org/10.3390/app15168996 | CC BY (open access) |
| [9] | S. Subedi, S. K. Acharya, J. Lee, S. Lee, "Two-Level Clustering Algorithm for Cluster Head Selection in Randomly Deployed Wireless Sensor Networks" (**TLC-LEACH**), Telecom 5(3), 27, 2024. | https://doi.org/10.3390/telecom5030027 | CC BY (open access) |

Papers [6]–[9] are open access, so their PDFs can be added to `3_RECENT/`
(for example `EECH-HEED_Kaur2025.pdf`).

EECH-HEED is the only recent paper that was re-implemented (`code/*/eechheed_*`).
It follows Eq. 4 (HEED zone), Eq. 5 (EECH zone, node degree), Eq. 6 (dynamic
threshold with α, β and the G set) and Eq. 7 (adaptive sensing).
The published result (Table 7) is FND 1250, HND 1650, LND 2200, PDR 95%.

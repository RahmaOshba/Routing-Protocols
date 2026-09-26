# Energy-Efficient Secure Clustering in WSNs Using Hybrid Cryptography

Master's thesis — Eng. Rahma Khaled Oshba. ns-3.41 simulations of LEACH, HEED,
PEGASIS, two LEACH + HEED hybrids from the literature (SH-LEACH, H-LEACH),
EECH-HEED, and the proposed protocol (v1 → v8-Chain).

| Folder | Content |
|---|---|
| `code/` | All simulation codes, split into `1_ORIGINAL`, `2_EDITED`, `3_IMPROVED`, `4_PROPOSED` (see `code/README.md`) |
| `results/` | The output of every code, in the same folders (see `results/README.md`) |
| `papers/` | The research papers, split into `1_ORIGINAL`, `2_HYBRID`, `3_RECENT` (see `papers/README.md`) |
| `figures/` | Screenshots and diagrams |
| `thesis-final/` | Defense deck, State-of-the-Art report, Literature Review (Word + Excel comparison) and Results Comparison workbook — all built from `results/` (see `thesis-final/build/README.md`) |
| `thesis-v8/` | Older thesis files (history) |

Headline result (unified environment, BS at the centre): **v8 FND 2446 /
HND 2536 / LND 2566 rounds, PDR 99.72%**; with the BS far away **v8-Chain FND 1626**.
The best reproduced protocol, SH-LEACH Improved, reaches FND 1480.

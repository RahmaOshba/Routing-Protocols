# Build scripts for the thesis documents

Every number in the deck, the reports and the workbook is read from
`../../results/summary_all.csv`, so the documents always match the simulation runs.

| Script | Output |
|---|---|
| `make_figures.py` | charts in `fig/` (set `SNAP_DIR` to a folder with `v8_chain_*-node-energy.csv` for the topology snapshots) |
| `make_figures2.py` | background diagrams, energy-vs-distance, paper-vs-code charts, hybrid CH counts, security cost, demo packet table (`fig/b*`, `e1`, `p1`, `h1`, `h2`, `c1`, `s1`, `k1`) |
| `make_figures3.py` | security figures for the proposal scheme (AES + RSA / ECC) and the Wireshark frame decode (`fig/s2`–`s5`, `k2`, `eq_security`) |
| `make_architecture.py` | `fig/f12_architecture.png` — architecture of v8-Chain |
| `make_demo_figure.py` | `fig/demo_layout.png` + `fig/demo_results.json` from `demo_output.txt` (real ns-3.41 run of `code/0_FIRST_EXPERIMENTS/demo_clustered_wsn.cc`) |
| `deck.js` | `../Thesis_Defense_v8-Chain.pptx` |
| `build_sota.js` | `../SOTA_Report_v8-Chain.docx` — short version: what we did, results, comparisons, charts |
| `build_litreview.js` | `../Literature_Review.docx` |
| `build_results_xlsx.py` | `../Results_Comparison.xlsx` (then recalculate the formulas, e.g. open it in Excel) |
| `build_litreview_xlsx.py` | `../Literature_Review_Comparison.xlsx` — literature review as a comparison table |
| `build_parameters.js` | `../Simulation_Parameters_Guide.docx` — meaning, role and choice of every simulation parameter |

`common.js` (data, references, environment) and `docx_lib.js` (Word helpers) are shared.
The Node scripts need `pptxgenjs`, `docx`, `react`, `react-dom`, `react-icons` and `sharp`.

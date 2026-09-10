# Data — Predictive Maintenance

This directory contains all datasets used by the Predictive Maintenance project.
Raw files are **excluded from Git** (see `.gitignore`). Only metadata and this
documentation file are tracked.

---

## Dataset Purpose

The dataset supports two core predictive-maintenance tasks:

| Task | Description |
|---|---|
| **State of Health (SOH)** | Estimate the remaining capacity of a battery or component relative to its rated capacity. |
| **Remaining Useful Life (RUL)** | Predict how many cycles / hours of operation remain before the component reaches end-of-life. |

Training accurate SOH and RUL models requires time-series measurements collected
across many charge–discharge (or operation) cycles, ideally from components run to
failure under controlled conditions.

---

## Expected Input Features

The following signals are the minimum expected inputs. Additional features may be
added as the project evolves.

| Feature | Unit | Description |
|---|---|---|
| `voltage` | V | Terminal voltage of the cell / component |
| `current` | A | Charge or discharge current (positive = charge) |
| `temperature` | °C | Surface or ambient temperature |
| `cycle_index` | — | Monotonically increasing cycle counter |
| `time` | s | Elapsed time within the current cycle |
| `capacity` | Ah | Measured capacity for the current cycle |
| `internal_resistance` | Ω | (Optional) Measured internal resistance |

> **Note:** Not all source datasets expose every feature listed above. Document
> any missing columns in a per-dataset note when placing data in `data/raw/`.

---

## Target Variables

| Target | Symbol | Description |
|---|---|---|
| State of Health | `soh` | `capacity_cycle_n / rated_capacity` — dimensionless, range 0–1 |
| Remaining Useful Life | `rul` | Number of cycles remaining until SOH drops below the EOL threshold (typically 0.80) |

Both targets may be derived from the raw measurements during the preprocessing
step (`ml/preprocessing/`).

---

## Dataset Source

> **Placeholder — no dataset has been downloaded yet.**
>
> Update this section once a dataset is selected. Candidate public datasets include:
>
> - NASA Prognostics Center of Excellence (PCoE) Battery Dataset
> - CALCE Battery Research Group Dataset (University of Maryland)
> - Oxford Battery Degradation Dataset
> - SNL / Sandia National Laboratories Dataset
>
> Record the exact source URL, licence, and version here before committing.

```
Source URL  : <to be filled in>
Licence     : <to be filled in>
Version     : <to be filled in>
Downloaded  : <YYYY-MM-DD>
Downloaded by: <name>
```

---

## Expected File Structure

After downloading and organising the dataset, `data/` should look like this:

```
data/
├── README.md               ← this file (tracked in Git)
├── dataset_info.json       ← metadata snapshot (tracked in Git, created after download)
│
├── raw/                    ← original, unmodified source files (NOT tracked in Git)
│   ├── <dataset_name>/
│   │   ├── battery_01.csv
│   │   ├── battery_02.csv
│   │   └── ...
│   └── ...
│
├── processed/              ← cleaned & feature-engineered files (NOT tracked in Git)
│   ├── train.parquet
│   ├── val.parquet
│   └── test.parquet
│
└── interim/                ← intermediate outputs during processing (NOT tracked in Git)
    └── ...
```

---

## Local Setup Instructions

1. **Obtain the dataset** from the source recorded in [Dataset Source](#dataset-source) above.

2. **Place raw files** under `data/raw/<dataset_name>/` without renaming or modifying them.

3. **Run the preprocessing pipeline** (to be implemented in `ml/preprocessing/`):
   ```bash
   python ml/preprocessing/run_preprocessing.py --source data/raw/<dataset_name>
   ```
   This will generate the processed `.parquet` files in `data/processed/`.

4. **Verify the structure** matches the [Expected File Structure](#expected-file-structure) above.

5. **Do not commit** any files under `data/raw/`, `data/processed/`, or `data/interim/` —
   they are excluded in `.gitignore`.

> If you need to share the dataset with the team, use the agreed cloud storage
> location and record the link in [Dataset Source](#dataset-source).

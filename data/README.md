# Data — Predictive Maintenance

This directory contains all datasets used by the Predictive Maintenance project.
Raw files are **excluded from Git** (see `.gitignore`). Only metadata, folder
structure, and this documentation file are tracked.

---

## Dataset

**AI4I 2020 Predictive Maintenance Dataset**

| Property | Value |
|---|---|
| Records | 10,000 |
| Columns | 14 |
| Primary target | `Machine failure` (binary: 0 / 1) |
| Source | [Kaggle — stephanmatzka/predictive-maintenance-dataset-ai4i-2020](https://www.kaggle.com/datasets/stephanmatzka/predictive-maintenance-dataset-ai4i-2020) |
| Licence | See Kaggle dataset page |

---

## Dataset Purpose

The dataset simulates a realistic industrial predictive-maintenance scenario.
The goal is to predict whether a machine will fail (`Machine failure = 1`) based
on operational sensor readings collected during production.

---

## Input Features

The following columns are used as **model input features**:

| Column | Type | Description |
|---|---|---|
| `Type` | Categorical | Product quality variant: L (low), M (medium), H (high) |
| `Air temperature [K]` | Continuous | Ambient air temperature in Kelvin |
| `Process temperature [K]` | Continuous | Process temperature in Kelvin |
| `Rotational speed [rpm]` | Continuous | Rotational speed of the tool in RPM |
| `Torque [Nm]` | Continuous | Torque applied in Newton-metres |
| `Tool wear [min]` | Continuous | Total tool wear time in minutes |

---

## Target Variable

| Column | Description |
|---|---|
| `Machine failure` | Binary label — 1 if any failure mode occurred, 0 otherwise |

---

## Failure-Mode Columns (Reference Only — NOT Input Features)

> ⚠️ **Data Leakage Warning**
>
> The following columns indicate specific failure causes. They are **derived from
> the target** and must NOT be used as input features for the `Machine failure`
> prediction model. Using them would cause target leakage and invalidate any
> model trained with them.

| Column | Full Name |
|---|---|
| `TWF` | Tool Wear Failure |
| `HDF` | Heat Dissipation Failure |
| `PWF` | Power Failure |
| `OSF` | Overstrain Failure |
| `RNF` | Random Failure |

These columns may be used separately for multi-label or multi-class failure-mode
classification tasks, but never as features in the main binary failure model.

---

## Expected File Structure

```
data/
├── README.md               ← this file (tracked in Git)
├── raw/                    ← original, unmodified downloaded file (NOT tracked in Git)
│   └── ai4i2020.csv
├── processed/              ← cleaned & feature-engineered outputs (NOT tracked in Git)
│   ├── train.csv
│   ├── val.csv
│   └── test.csv
```

---

## Local Setup Instructions

1. **Download the dataset** from Kaggle:
   [https://www.kaggle.com/datasets/stephanmatzka/predictive-maintenance-dataset-ai4i-2020](https://www.kaggle.com/datasets/stephanmatzka/predictive-maintenance-dataset-ai4i-2020)

   You will need a free Kaggle account. You can also use the Kaggle CLI:
   ```bash
   kaggle datasets download -d stephanmatzka/predictive-maintenance-dataset-ai4i-2020
   ```

2. **Place the raw file** at:
   ```
   data/raw/ai4i2020.csv
   ```
   Do not rename or modify it.

3. **Run the preprocessing pipeline** (to be implemented in `ml/src/`):
   ```bash
   python ml/src/preprocess.py
   ```
   This will generate train/val/test splits in `data/processed/`.

4. **Do not commit** any files under `data/raw/` or `data/processed/` —
   they are excluded by `.gitignore`.

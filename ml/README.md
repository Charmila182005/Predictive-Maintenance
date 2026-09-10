# ML — Predictive Maintenance

This directory contains all machine-learning code for the Predictive Maintenance project.

---

## Directory Structure

```
ml/
├── notebooks/          ← Exploratory and experimental Jupyter notebooks
├── src/                ← Production-ready Python scripts and modules
└── README.md           ← this file
```

---

## Dataset

**AI4I 2020 Predictive Maintenance Dataset** (10,000 records, 14 columns)

- **Target:** `Machine failure` (binary: 0 = no failure, 1 = failure)
- **Input features:** `Type`, `Air temperature [K]`, `Process temperature [K]`,
  `Rotational speed [rpm]`, `Torque [Nm]`, `Tool wear [min]`

> ⚠️ **Data Leakage Rule:** `TWF`, `HDF`, `PWF`, `OSF`, and `RNF` are failure-mode
> indicators derived from the target. They must **never** be used as input features
> for the main `Machine failure` model.

See [`data/README.md`](../data/README.md) for download instructions.

---

## Planned ML Workflow

### 1. Dataset Loading

- Load `data/raw/ai4i2020.csv` using `pandas`.
- Validate column names, dtypes, and row count against the expected schema.
- Log any discrepancies and abort early if the schema is invalid.

**Script:** `ml/src/load_data.py`

---

### 2. Data Validation

- Check for missing values in all columns.
- Verify value ranges (e.g. temperature > 0, RPM > 0, torque > 0).
- Confirm target column (`Machine failure`) is binary (0/1 only).
- Confirm failure-mode columns (`TWF`, `HDF`, `PWF`, `OSF`, `RNF`) are binary.
- Assert that `Machine failure == 1` whenever any failure-mode flag is 1.
- Raise descriptive errors for any validation failure.

**Script:** `ml/src/validate_data.py`

---

### 3. Exploratory Data Analysis (EDA)

- Compute class distribution for `Machine failure` (expected: heavily imbalanced).
- Plot distributions of each numerical feature, split by failure class.
- Compute and visualise the correlation matrix.
- Inspect failure-mode co-occurrence (for reference only — not used as features).
- Analyse `Type` category distribution and its relationship to failure rate.

**Notebook:** `ml/notebooks/01_eda.ipynb`

---

### 4. Preprocessing

- **Encode categoricals:** One-hot encode `Type` (L / M / H).
- **Scale numericals:** Apply `StandardScaler` to all continuous features.
- **Drop leakage columns:** Explicitly drop `TWF`, `HDF`, `PWF`, `OSF`, `RNF`
  before any modelling step.
- **Train / validation / test split:** Stratified split to preserve class ratio
  (suggested: 70% train / 15% val / 15% test).
- **Persist artefacts:** Save fitted scaler and encoder to `models/` for
  reproducible inference.

**Script:** `ml/src/preprocess.py`

---

### 5. Class Imbalance Handling

The dataset is expected to be imbalanced (failure events are rare).
The following strategies will be evaluated:

| Strategy | Description |
|---|---|
| `class_weight="balanced"` | Weight minority class inversely proportional to frequency |
| SMOTE | Synthetic Minority Over-sampling Technique (applied to training set only) |
| Threshold tuning | Adjust classification threshold on validation set to maximise F1 |

Oversampling (SMOTE) will be applied **only inside the training fold** to avoid
data leakage into validation or test sets.

**Script:** `ml/src/imbalance.py`

---

### 6. Feature Selection

- Compute feature importances from a baseline Random Forest.
- Apply `SelectFromModel` or `RFE` to identify top features.
- Validate that no leakage columns (`TWF`, `HDF`, `PWF`, `OSF`, `RNF`) appear
  in the selected feature set.
- Document the final selected feature set before training.

**Notebook:** `ml/notebooks/02_feature_selection.ipynb`

---

### 7. Model Training

Candidate models to train and compare:

| Model | Library | Notes |
|---|---|---|
| Logistic Regression | scikit-learn | Baseline |
| Random Forest | scikit-learn | Strong baseline, feature importances |
| Gradient Boosting (XGBoost / LightGBM) | xgboost / lightgbm | Expected best performer |
| Support Vector Machine | scikit-learn | Optional |

- All models trained using stratified k-fold cross-validation (k=5).
- Hyperparameter tuning via `GridSearchCV` or `Optuna`.
- Final model selected based on validation F1-score (primary metric) and
  ROC-AUC (secondary metric).

**Script:** `ml/src/train.py`

---

### 8. Model Evaluation

Metrics reported on the held-out **test set** only:

| Metric | Rationale |
|---|---|
| F1-score (macro & per-class) | Primary — balances precision and recall for imbalanced data |
| ROC-AUC | Threshold-independent discrimination ability |
| Precision / Recall | Per-class breakdown |
| Confusion matrix | Visual breakdown of TP / TN / FP / FN |
| PR curve | More informative than ROC for imbalanced classes |

**Script:** `ml/src/evaluate.py`  
**Notebook:** `ml/notebooks/03_evaluation.ipynb`

---

### 9. Explainability

- **SHAP values** — global and per-instance feature attributions using
  `shap.TreeExplainer` (for tree-based models) or `shap.LinearExplainer`.
- **Permutation importance** — model-agnostic global importance as a cross-check.
- **Partial Dependence Plots (PDP)** — visualise the marginal effect of each
  top feature on the predicted failure probability.

**Notebook:** `ml/notebooks/04_explainability.ipynb`

---

### 10. Model Saving

- Serialise the final trained model using `joblib` to `models/`.
- Save the fitted preprocessor (scaler + encoder) alongside the model.
- Save a `models/model_card.md` recording: model type, training date, dataset
  version, evaluation metrics, and known limitations.

**Script:** `ml/src/save_model.py`

---

## Key Design Rules

1. **No target leakage** — `TWF`, `HDF`, `PWF`, `OSF`, `RNF` are never used as input features.
2. **No test-set contamination** — scaling, encoding, and SMOTE are fitted on
   training data only and applied to val/test.
3. **Reproducibility** — all random seeds are fixed and logged.
4. **Separation of concerns** — notebooks are for exploration; `src/` scripts are
   for reproducible pipeline runs.

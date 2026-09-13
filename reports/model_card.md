# Model card: ai4i-pilot-1.0.0-2026-09-09

## Intended use

Controlled demonstration/pilot candidate for condition-level manufacturing maintenance decision support, based only on synthetic AI4I milling data. Users are maintenance engineers, operators and supervisors with a human approval workflow. No autonomous equipment control, future horizon, RUL, physical root-cause proof or universal factory approval.

## Model and training

Selected random_forest; uncalibrated; calibrated candidates compared on validation. Training-only preprocessing: imputation, L/M/H encoding, temperature difference, mechanical power and overstrain. Six raw predictors; no labels or identifiers. Seed 42; 6000/2000/2000 stratified split; five-fold CV; comparison of five candidate families. Threshold 0.279040373384 selected on validation using 5*FN+FP and recall >= 0.80. Model remained fitted on 6000 rows. This cost policy requires factory approval.

| Metric | Training CV mean ± SD (threshold 0.5) | Validation (selected threshold) | Untouched test (selected threshold) |
| --- | --- | --- | --- |
| Failure precision | 0.9498 ± 0.0365 | 0.7746 | 0.7763 |
| Failure recall | 0.8326 ± 0.0402 | 0.8088 | 0.8676 |
| Failure F1 | 0.8870 ± 0.0347 | 0.7914 | 0.8194 |
| PR-AUC / average precision | 0.9002 ± 0.0478 | 0.8606 | 0.8856 |
| ROC-AUC | 0.9705 ± 0.0199 | 0.9790 | 0.9677 |
| Balanced accuracy | 0.9155 ± 0.0204 | 0.9003 | 0.9294 |

Test TN/FP/FN/TP: {'tn': 1915, 'fp': 17, 'fn': 9, 'tp': 59}. Test Brier 0.008606. Uncertainty intervals and subgroup supports: `reports/metrics/test_metrics*.json`. Random row splitting and synthetic generation limit inference beyond this benchmark.

## Complementary components

Independent HDF/PWF/OSF binary models with rare supports and uncalibrated probabilities. TWF uses condition context, RNF a descriptive base rate, both with null personalized probability. Isolation Forest is trained on normal training rows only; contamination 0.02, percentile score not failure probability. Tree SHAP, offline Kernel SHAP, global validation permutation importance, and explicit AI4I rules provide supporting evidence, not causality.

## Risks and limitations

- Synthetic, generation-rule-driven dataset; no real factory validation, cadence, trustworthy asset histories, or forecast horizon.
- Label-mode union differs in 27 rows; all original labels preserved. Rare modes and overlapping outcomes limit reliability.
- Product-type splits contain few positive examples; apparent perfect metrics on small mode samples do not establish dependable deployment accuracy.
- Probability outputs may be poorly calibrated after distribution change. A numerical zero/one is not a physical certainty.
- Correlated engineered/raw features complicate attribution; SHAP and permutation effects depend on model/background and can use unrealistic combinations.
- Missing readings are rejected without prediction; out-of-training-range readings return warnings and should be reviewed. Idle/down states are outside modeled running context.
- Workflow decisions, safety controls and maintenance approval remain with qualified site personnel.

## Deployment, monitoring and governance

Use the factory checklist. Verify sensor units and mapping, independent history, cost thresholds, probability calibration, cybersecurity, shadow-mode acceptance and human approval. Monitor schema/missing/OOD rates, feature and prediction drift, failure-alert rate, latency and confirmed outcomes. Centralize logs for multiple workers. Separate synthetic verification telemetry from new factory records. Feedback does not retrain automatically. Version and roll back model, config and container together. Hash checks detect accidental corruption; trust/signed provenance must be established externally before deserialization.

## Provenance

[UCI AI4I 2020](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset), CC BY 4.0, DOI 10.24432/C5HS5C. Exact original hashes, download UTC, owner and local filenames are in `data/raw/manifest.json`. Current model metadata: `models/model_metadata.json`. Reproducing with the already disclosed test does not create new unbiased evidence.

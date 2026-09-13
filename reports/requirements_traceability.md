# Requirements traceability

The pasted user request governs implementation. The two supplied PDFs provide architecture/domain requirements; quoted examples and future-risk wording are not performance evidence or authority to claim a temporal model.

| Requirement | Implementation | Executed evidence |
| --- | --- | --- |
| Six inputs, derived units, explicit schemas | src/schemas.py; src/feature_engineering.py | test_features.py; test_inference.py |
| Official source and immutable data | scripts/prepare_data.py; data/raw/manifest.json | dataset_inventory.json; hash checks |
| Data quality, imbalance, label conflicts | src/data_validation.py; reports/data_quality_report.json | executed notebook; source CSV checks |
| No identifier/label leakage; train-only transformations | FeatureBuilder strict allowlist; saved split indices | test_no_leakage.py (16 tests) |
| AI4I HDF/PWF/OSF/TWF/RNF evidence | src/condition_engine.py | strict rule-boundary tests |
| Five candidate families; stratified CV; bounded tuning | src/train.py | model_comparison.csv; cross_validation.csv; search CSVs |
| Validation-only threshold/calibration and frozen test | selection_decision_before_test.json; threshold.json | chronology test; test_predictions.csv |
| Metrics, subgroups, confidence intervals and plots | src/evaluate.py; reports/metrics; reports/figures | ten generated PNGs; metric JSON/CSV |
| Multilabel modes and rare/random limitations | src/failure_mode_model.py | failure_mode_metrics.json/CSV |
| Normal-only novelty model | src/anomaly_detection.py | anomaly_metrics.json; artifact verification |
| Global/local explanations and fallback | src/explain.py | Kernel SHAP saved additivity; runtime Tree SHAP tests |
| Configurable health, risk, actions and urgency | configs/maintenance_rules.yaml; recommendation_engine.py | healthy/high-risk CLI/API/UI tests |
| CLI, batch, API and manual form | src/predict.py; api.py; ui.py | pytest; real service checks; CLI output examples |
| Factory adapters and timestamp metadata | src/adapters.py; schemas.py | metadata-exclusion tests; sample CSV |
| Logging, monitoring and feedback hooks | src/common.py; monitoring.py; logs | real monitoring and test feedback endpoint |
| Deployable packaging and configuration | Dockerfile; pyproject.toml; .env.example; requirements pins | pip check; Docker verification report |
| Notebook executed cleanly | scripts/execute_notebook.py | 10 cells; notebook_verification.json |
| All artifacts and separate-process loading | scripts/verify_artifacts.py; package_project.py | artifact manifest; verification JSON; archive test |
| Error recording and recovery | scripts/run_logged.py; common.stage | append-only logs/error.log; report correction table |
| No unsupported temporal/production claims | README; model card; factory checklist | explicit request governs conflicting PDF "soon" language |

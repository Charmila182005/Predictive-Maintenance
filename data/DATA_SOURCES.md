# Dataset sources and suitability

Only **AI4I 2020 Predictive Maintenance Dataset** was used. Both supplied workspace roots were inventoried before downloading data; neither contained a dataset. See `reports/dataset_inventory.json`.

| Provenance field | Value |
|---|---|
| Owner | Stephan Matzka; distributed by UCI Machine Learning Repository |
| Official source | [UCI dataset page](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset) |
| Original download | [UCI ZIP](https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip) |
| DOI | [10.24432/C5HS5C](https://doi.org/10.24432/C5HS5C) |
| Download UTC | 2026-09-09T10:08:25.462358+00:00 |
| Version | 2020 UCI release; exact bytes identified by SHA-256 |
| License | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Intended use | Synthetic milling operating-condition binary/multilabel classification and novelty detection; no forecast horizon or RUL |

- `data\raw\ai4i2020_uci_original.zip`: 522,170 bytes; SHA-256 `f601f14294bcf190f9d720676b7f0aea46a26cde9ab8ebc7b4f8174d9d26b252`.
- `data\raw\ai4i2020.csv`: 522,048 bytes; SHA-256 `dc6630cd9b1f0f853922fad78a1b6436570d3f1ec863f1dd5c4340ac56bc8a8e`.

Raw CSV bytes match the original ZIP member. Training verifies the recorded hash, preserves every raw row and label, and writes separate canonical processed splits. The local file is the source of empirical label counts; narrative generation descriptions do not override observed labels.

## Sensors, machines, sampling and target definitions

Six inputs: Type L/M/H; air and process temperatures in K; rotational speed in rpm; torque in Nm; accumulated tool wear in minutes. One synthetic milling-process population is represented. There is no trustworthy asset grouping, sampling interval, event timestamp, or defined future label horizon. `UDI` and `Product ID` are excluded identifiers. `Machine failure` is the supplied condition-level binary target. TWF, HDF, PWF, OSF and RNF are overlapping mode labels and are all excluded from every predictor matrix.

This dataset matches the requested input interface and supports an in-dataset operating-condition demonstration. It does not validate sensor calibration, alert burden, equipment transfer, temporal forecasting, downtime duration, or remaining useful life at a factory. There is no reason to add unrelated sensors or incompatible machine datasets to enlarge the row count. No additional dataset was combined or used for model training, calibration, explanations, or anomaly detection.

Citation: AI4I 2020 Predictive Maintenance Dataset [Dataset]. (2020). UCI Machine Learning Repository. DOI: 10.24432/C5HS5C. Dataset contribution attributed to Stephan Matzka.

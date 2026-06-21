# ML — REPIF model

* REPIF (Real Estate Prices In France)
* Machine learning pipeline for apartments and houses price estimation
* Trained on DVF+ and DPE (ADEME) data
* Trained on local compputer for the moment

## Setup

```bash
cd ml
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
pip install -e .
```

## Data Sources

* NB: no data provided for: Alsace, Moselle and Mayotte
* Open data does not exist for those on the French Govenement Websites
* Format CSV and download manually
    * Loading SQL dumps is overkill for the moment because to costly in term of Disk space
    * CSV files are gitignored

### DVF+ "mutation" (transfer) in local DB

* Data source: [dvfplus-open-data](https://datafoncier.cerema.fr/donnees/autres-donnees-foncieres/dvfplus-open-data)
    * Go to "Espace de téléchargement > avril_2026 > csv"
    * Extract data
    * Get csv files within \National\DVF_PLUS_2026_1_CSV_R999_ED251_part\DVF_PLUS_2026_1_CSV_R999_ED251\1_DONNEES_LIVRAISON
    * Drop them into ml/csv_data/dvf_plus
* Data description:
    * Dictionary: [dv3f dictionnary](https://doc-datafoncier.cerema.fr/doc/dv3f/?v=8)
    * Similar to dvf+
    * 1 row = 1 sale

### DPE data from ADEME

* Data source: https://data.ademe.fr/datasets/dpe03existant
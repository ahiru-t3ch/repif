# Data — DVF (Demandes de Valeurs Foncières)

**REPIF** (Real Estate Prices In France) — housing transaction data used to train and validate the price prediction model. Beta scope: **Haute-Garonne (department 31)** — Toulouse and surrounding communes.

## Role in the product

Raw official French real-estate sales feed the ML pipeline. Cleaned and filtered rows become training examples for the linear regression model that powers `/predict`.

## Source

**DVF** — open data published by [data.gouv.fr](https://www.data.gouv.fr/) / Etalab.

Each row is a property transaction (sale) with fields such as:

| French column (source) | English name (used in ML) |
|---|---|
| `valeur_fonciere` | `price` |
| `surface_reelle_bati` | `living_area` |
| `nombre_pieces_principales` | `room_count` |
| `code_postal` | `postal_code` |
| `type_local` | `property_type` |
| `nature_mutation` | `transaction_type` |
| `nombre_lots` | `lot_count` |
| `id_mutation` | (used for deduplication) |

## Expected file

```
data/
└── dvf.csv    # Not committed to git (too large, ~70+ MB)
```

Place the department 31 export here after download. Document the **year/version** used so results stay reproducible.

## How to obtain the data

1. Go to [data.gouv.fr — DVF](https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/)
2. Download the file for **department 31** (Haute-Garonne)
3. Save as `data/dvf.csv`

## Why it is not in git

- File size exceeds comfortable git limits (GitHub warns from 50 MB, blocks at 100 MB)
- Listed in root `.gitignore` as `data/*.csv`
- Reproducibility via documented download steps instead of committing the blob

## Cleaning principles (used in ML)

The notebook/script applies filters such as:

- Keep **sales** only (`transaction_type == "Vente"`)
- Keep **apartments** only (`property_type == "Appartement"`)
- Keep **single-lot** sales (`lot_count == 1`) to avoid price/surface mismatches
- Deduplicate by `id_mutation` (one row per transaction)
- Drop outliers on price, surface, and price per m²
- Convert numeric columns (French decimal commas → floats)

## Beta scope

- Single department (31) — model does not generalize to all of France
- Static CSV snapshot — no live DVF API integration yet
- Data quality directly impacts model R²; garbage in, garbage out

## Privacy

DVF is **aggregated public transaction data** — no personal identifiers in the published files. Still handle exports responsibly and do not republish raw files without checking license terms on data.gouv.fr.

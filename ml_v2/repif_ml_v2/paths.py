from pathlib import Path

ML_V2_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_V2_DIR.parent
ML_DIR = REPO_ROOT / "ml"

DEFAULT_DVF_DIR = ML_DIR / "csv_data" / "dvf_plus"
DEFAULT_DPE_CSV = ML_DIR / "csv_data" / "dpe" / "dpe-france.csv"
DEFAULT_MODELS_DIR = ML_V2_DIR / "models"

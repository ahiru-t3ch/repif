from dataclasses import dataclass, field


@dataclass(frozen=True)
class PropertyConfig:
    name: str
    codtypbien: int
    rooms_source_cols: tuple[str, ...]
    rooms_feature: str
    max_dist_m: float
    sterr_min: float
    sterr_max: float
    sterr_strictly_positive: bool
    extra_columns: tuple[str, ...] = ()
    features: tuple[str, ...] = ()
    monotone: dict[str, int] = field(default_factory=dict)
    dpe_building_types: str = "apartment"  # apartment | house
    n_iter: int = 20
    n_cv_splits: int = 3
    train_ratio: float = 0.8


APARTMENT_CONFIG = PropertyConfig(
    name="apartment",
    codtypbien=121,
    rooms_source_cols=(
        "nbapt1pp",
        "nbapt2pp",
        "nbapt3pp",
        "nbapt4pp",
        "nbapt5pp",
    ),
    rooms_feature="apartement_rooms",
    max_dist_m=30,
    sterr_min=0,
    sterr_max=5_000,
    sterr_strictly_positive=False,
    features=(
        "lon",
        "lat",
        "sbati",
        "l_codinsee",
        "apartement_rooms",
        "nblocdep",
        "sterr",
        "dpe_median",
        "annee_construction",
    ),
    monotone={"sbati": 1, "sterr": 1, "dpe_median": -1},
    dpe_building_types="apartment",
    n_iter=20,
    n_cv_splits=3,
)

HOUSE_CONFIG = PropertyConfig(
    name="house",
    codtypbien=111,
    rooms_source_cols=(
        "nbmai1pp",
        "nbmai2pp",
        "nbmai3pp",
        "nbmai4pp",
        "nbmai5pp",
    ),
    rooms_feature="home_rooms",
    max_dist_m=75,
    sterr_min=0,
    sterr_max=50_000,
    sterr_strictly_positive=True,
    extra_columns=("log_sterr",),
    features=(
        "lon",
        "lat",
        "sbati",
        "l_codinsee",
        "home_rooms",
        "nblocdep",
        "log_sterr",
        "dpe_median",
        "annee_construction",
    ),
    monotone={"sbati": 1, "log_sterr": 1, "dpe_median": -1},
    dpe_building_types="house",
    n_iter=20,
    n_cv_splits=3,
)

DVF_BASE_COLS = (
    "datemut",
    "anneemut",
    "valeurfonc",
    "sbati",
    "sterr",
    "codtypbien",
    "idnatmut",
    "l_codinsee",
    "nblocdep",
    "geompar_x",
    "geompar_y",
)

import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

GEOCODE_SEARCH_URL = "https://data.geopf.fr/geocodage/search"
DEFAULT_TIMEOUT_S = 10.0
DEFAULT_MIN_SCORE = 0.5


class GeocodingError(Exception):
    """Raised when an address cannot be geocoded reliably."""


@dataclass(frozen=True)
class GeocodeResult:
    lat: float
    lon: float
    l_codinsee: str
    label: str
    score: float


def geocode_address(
    address: str,
    *,
    min_score: float = DEFAULT_MIN_SCORE,
    timeout_s: float = DEFAULT_TIMEOUT_S,
) -> GeocodeResult:
    """Geocode a French address via the Géoplateforme BAN search API.

    Returns WGS84 coordinates and the INSEE commune code (`l_codinsee`).
    GeoJSON coordinates are [lon, lat].
    """
    query = address.strip()
    if not query:
        raise GeocodingError("Address is empty")

    try:
        response = httpx.get(
            GEOCODE_SEARCH_URL,
            params={"q": query, "limit": 1, "index": "address"},
            timeout=timeout_s,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Geocoding HTTP error for %r: %s", query, exc)
        raise GeocodingError("Geocoding service returned an error") from exc
    except httpx.RequestError as exc:
        logger.warning("Geocoding request failed for %r: %s", query, exc)
        raise GeocodingError("Geocoding service is unavailable") from exc

    payload = response.json()
    features = payload.get("features") or []
    if not features:
        raise GeocodingError(f"No match found for address: {query}")

    feature = features[0]
    properties = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []

    if len(coordinates) < 2:
        raise GeocodingError("Geocoding response has no coordinates")

    score = float(properties.get("score") or 0.0)
    if score < min_score:
        label = properties.get("label") or query
        raise GeocodingError(
            f"Low-confidence match ({score:.2f}) for address: {label}"
        )

    citycode = str(properties.get("citycode") or "").strip()
    if len(citycode) != 5 or not citycode.isdigit():
        raise GeocodingError("Geocoding response has no valid INSEE city code")

    lon = float(coordinates[0])
    lat = float(coordinates[1])
    label = str(properties.get("label") or query)

    logger.info(
        "Geocoded %r -> %s (citycode=%s, score=%.2f)",
        query,
        label,
        citycode,
        score,
    )

    return GeocodeResult(
        lat=lat,
        lon=lon,
        l_codinsee=citycode,
        label=label,
        score=score,
    )

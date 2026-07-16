import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

GEOCODE_SEARCH_URL = "https://data.geopf.fr/geocodage/search"
DEFAULT_TIMEOUT_S = 10.0
DEFAULT_SUGGEST_TIMEOUT_S = 5.0
DEFAULT_MIN_SCORE = 0.5
DEFAULT_SUGGEST_LIMIT = 5
MAX_SUGGEST_LIMIT = 10
MIN_SUGGEST_QUERY_LENGTH = 3


class GeocodingError(Exception):
    """Raised when an address cannot be geocoded reliably."""


@dataclass(frozen=True)
class GeocodeResult:
    lat: float
    lon: float
    l_codinsee: str
    label: str
    score: float


@dataclass(frozen=True)
class SuggestedAddress:
    label: str
    score: float
    city: str
    postcode: str


def suggest_addresses(
    query: str,
    *,
    limit: int = DEFAULT_SUGGEST_LIMIT,
    timeout_s: float = DEFAULT_SUGGEST_TIMEOUT_S,
) -> list[SuggestedAddress]:
    """Return address suggestions from the Géoplateforme BAN search API.

    Uses the same ``/search`` endpoint as final geocoding so suggestion labels
    stay consistent with the address that will be geocoded on submit.
    Failures return an empty list so autocomplete stays non-blocking.
    """
    text = query.strip()
    if len(text) < MIN_SUGGEST_QUERY_LENGTH:
        return []

    capped_limit = max(1, min(limit, MAX_SUGGEST_LIMIT))

    try:
        response = httpx.get(
            GEOCODE_SEARCH_URL,
            params={
                "q": text,
                "limit": capped_limit,
                "index": "address",
                "autocomplete": 1,
            },
            timeout=timeout_s,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("Suggest HTTP error for %r: %s", text, exc)
        return []
    except httpx.RequestError as exc:
        logger.warning("Suggest request failed for %r: %s", text, exc)
        return []

    payload = response.json()
    features = payload.get("features") or []
    suggestions: list[SuggestedAddress] = []
    seen_labels: set[str] = set()

    for feature in features:
        properties = feature.get("properties") or {}
        label = str(properties.get("label") or "").strip()
        if not label or label in seen_labels:
            continue
        seen_labels.add(label)
        suggestions.append(
            SuggestedAddress(
                label=label,
                score=float(properties.get("score") or 0.0),
                city=str(properties.get("city") or "").strip(),
                postcode=str(properties.get("postcode") or "").strip(),
            )
        )

    return suggestions


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

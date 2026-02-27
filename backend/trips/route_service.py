"""
Route service using OSRM (free, no API key) for driving routes
and Nominatim (free, no API key) for geocoding.
"""

import requests
import time

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REVERSE_URL = "https://photon.komoot.io/reverse"
OSRM_URLS = [
    "https://router.project-osrm.org/route/v1/driving",
    "https://routing.openstreetmap.de/routed-car/route/v1/driving"
]

HEADERS = {"User-Agent": "SpotterAI-ELD-TripPlanner/1.0"}

def _make_osrm_request(coords, params):
    """
    Helper to make OSRM requests with retries across multiple fallback servers.
    """
    last_error = None
    for url_base in OSRM_URLS:
        url = f"{url_base}/{coords}"
        try:
            # Increase timeout to 30s to handle slow but working servers
            resp = requests.get(url, params=params, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok":
                    return data
                elif "message" in data:
                    last_error = ValueError(f"OSRM routing failed on {url_base}: {data['message']}")
            else:
                last_error = ValueError(f"OSRM API returned status {resp.status_code} from {url_base}")
                
        except requests.exceptions.RequestException as e:
            last_error = e
            print(f"OSRM request failed for {url_base}: {e}")
            continue # Try next URL

    raise ValueError(f"All OSRM routing servers failed. Last error: {last_error}")


def geocode(address):
    """Convert an address string to (lat, lng) coordinates. Retries with broader search on failure."""
    params = {
        "q": address,
        "format": "json",
        "limit": 5,
        "countrycodes": "us",
    }
    resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    results = resp.json()

    # If no results with US filter, retry without country restriction
    if not results:
        time.sleep(1.1)  # Nominatim rate limit
        params_broad = {
            "q": address,
            "format": "json",
            "limit": 5,
        }
        resp = requests.get(NOMINATIM_URL, params=params_broad, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        raise ValueError(f"Could not find location: '{address}'. Please check the spelling and try again.")

    return {
        "lat": float(results[0]["lat"]),
        "lng": float(results[0]["lon"]),
        "display_name": results[0]["display_name"],
    }


def reverse_geocode(lat, lng):
    """Convert (lat, lng) coordinates to a readable address/city using Photon, with Nominatim fallback."""
    # First attempt: Photon
    params = {
        "lat": lat,
        "lon": lng,
    }
    try:
        resp = requests.get(REVERSE_URL, params=params, headers=HEADERS, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        
        if data.get("features"):
            props = data["features"][0].get("properties", {})
            city = props.get("city") or props.get("town") or props.get("village") or props.get("county")
            state = props.get("state")
            
            if city and state:
                return f"{city}, {state}"
            elif city:
                return city
            elif state:
                return f"Near {state}"
    except Exception:
        pass

    # Second attempt: Nominatim (more reliable for highway/rural areas)
    nominatim_reverse_url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
    }
    try:
        # Respect Nominatim rate limit if possible, though for a single retry it's usually fine
        resp = requests.get(nominatim_reverse_url, params=params, headers=HEADERS, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        
        address = data.get("address", {})
        city = address.get("city") or address.get("town") or address.get("village") or address.get("hamlet") or address.get("county")
        state = address.get("state")
        
        if city and state:
            return f"{city}, {state}"
        elif city:
            return city
        elif state:
            return f"Near {state}"
    except Exception:
        pass

    return "On Route"


def get_route(origin, destination):
    """
    Get driving route between two coordinate pairs.
    Returns distance (miles), duration (hours), and route geometry.
    """
    coords = f"{origin['lng']},{origin['lat']};{destination['lng']},{destination['lat']}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
    }
    data = _make_osrm_request(coords, params)

    route = data["routes"][0]
    distance_miles = route["distance"] * 0.000621371  # meters to miles
    duration_hours = route["duration"] / 3600  # seconds to hours
    geometry = route["geometry"]["coordinates"]  # [[lng, lat], ...]

    return {
        "distance_miles": round(distance_miles, 1),
        "duration_hours": round(duration_hours, 2),
        "geometry": geometry,
    }


def get_full_route(locations):
    """
    Get route through multiple waypoints.
    locations: list of {"lat": ..., "lng": ...} dicts
    """
    coords = ";".join(f"{loc['lng']},{loc['lat']}" for loc in locations)
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
    }
    data = _make_osrm_request(coords, params)

    route = data["routes"][0]
    distance_miles = route["distance"] * 0.000621371
    duration_hours = route["duration"] / 3600
    geometry = route["geometry"]["coordinates"]

    # Extract leg info
    legs = []
    for leg in route["legs"]:
        legs.append({
            "distance_miles": round(leg["distance"] * 0.000621371, 1),
            "duration_hours": round(leg["duration"] / 3600, 2),
        })

    return {
        "distance_miles": round(distance_miles, 1),
        "duration_hours": round(duration_hours, 2),
        "geometry": geometry,
        "legs": legs,
    }


def interpolate_point_on_route(geometry, fraction):
    """
    Find the approximate lat/lng at a given fraction (0-1) along a route geometry.
    geometry: list of [lng, lat] pairs
    """
    if not geometry:
        return None

    total_segments = len(geometry) - 1
    if total_segments <= 0:
        return {"lat": geometry[0][1], "lng": geometry[0][0]}

    # Calculate cumulative distances
    cumulative = [0]
    for i in range(1, len(geometry)):
        dx = geometry[i][0] - geometry[i - 1][0]
        dy = geometry[i][1] - geometry[i - 1][1]
        dist = (dx**2 + dy**2) ** 0.5
        cumulative.append(cumulative[-1] + dist)

    total_dist = cumulative[-1]
    if total_dist == 0:
        return {"lat": geometry[0][1], "lng": geometry[0][0]}

    target = fraction * total_dist

    # Find the segment
    for i in range(1, len(cumulative)):
        if cumulative[i] >= target:
            seg_start = cumulative[i - 1]
            seg_end = cumulative[i]
            seg_frac = (target - seg_start) / (seg_end - seg_start) if seg_end > seg_start else 0
            lng = geometry[i - 1][0] + seg_frac * (geometry[i][0] - geometry[i - 1][0])
            lat = geometry[i - 1][1] + seg_frac * (geometry[i][1] - geometry[i - 1][1])
            return {"lat": round(lat, 6), "lng": round(lng, 6)}

    return {"lat": geometry[-1][1], "lng": geometry[-1][0]}

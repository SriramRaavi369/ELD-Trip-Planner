"""
API views for the trip planner.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
import time
import requests as http_requests

from .route_service import geocode, get_route, get_full_route, interpolate_point_on_route, reverse_geocode, NOMINATIM_URL, HEADERS
from .hos_rules import plan_trip


@api_view(["POST"])
def trip_plan(request):
    """
    Plan a trip with HOS-compliant stops and ELD log sheets.

    POST body:
    {
        "current_location": "New York, NY",
        "pickup_location": "Philadelphia, PA",
        "dropoff_location": "Los Angeles, CA",
        "current_cycle_used": 10  // hours
    }
    """
    data = request.data

    # Validate inputs
    required_fields = ["current_location", "pickup_location", "dropoff_location", "current_cycle_used"]
    for field in required_fields:
        if field not in data:
            return Response(
                {"error": f"Missing required field: {field}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        current_cycle_used = float(data["current_cycle_used"])
        if current_cycle_used < 0 or current_cycle_used > 70:
            return Response(
                {"error": "current_cycle_used must be between 0 and 70"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except (ValueError, TypeError):
        return Response(
            {"error": "current_cycle_used must be a number"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Step 1: Geocode all locations
        current_loc = geocode(data["current_location"])
        time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
        pickup_loc = geocode(data["pickup_location"])
        time.sleep(1.1)
        dropoff_loc = geocode(data["dropoff_location"])

        # Step 2: Get routes
        # Current -> Pickup
        time.sleep(1.1)
        route_to_pickup = get_route(current_loc, pickup_loc)

        # Pickup -> Dropoff
        time.sleep(1.1)
        route_main = get_route(pickup_loc, dropoff_loc)

        # Full route for map display
        time.sleep(1.1)
        full_route = get_full_route([current_loc, pickup_loc, dropoff_loc])

        # Step 3: Plan trip with HOS rules
        # Use provided start_time or default to now
        start_time_str = data.get("start_time")
        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str)
            except (ValueError, TypeError):
                start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        else:
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        trip = plan_trip(
            total_distance_miles=route_main["distance_miles"],
            total_drive_time_hours=route_main["duration_hours"],
            current_cycle_used=current_cycle_used,
            start_time=start_time,
            pickup_distance_miles=route_to_pickup["distance_miles"],
            pickup_drive_time_hours=route_to_pickup["duration_hours"],
        )

        # Step 4: Add coordinates and geocoded names to stops
        total_route_miles = route_to_pickup["distance_miles"] + route_main["distance_miles"]
        for stop in trip["stops"]:
            if stop["type"] == "start":
                stop["coordinates"] = current_loc
                # Extract reasonably concise "City, State" or similar
                loc_parts = current_loc.get("display_name", "Start").split(', ')
                stop["location_name"] = ", ".join(loc_parts[:2]) if len(loc_parts) >= 2 else loc_parts[0]
                stop["reason"] = "Start"
            elif stop["type"] == "pickup":
                stop["coordinates"] = pickup_loc
                loc_parts = pickup_loc.get("display_name", "Pickup").split(', ')
                stop["location_name"] = ", ".join(loc_parts[:2]) if len(loc_parts) >= 2 else loc_parts[0]
                stop["reason"] = "Pickup"
            elif stop["type"] == "dropoff":
                stop["coordinates"] = dropoff_loc
                loc_parts = dropoff_loc.get("display_name", "Dropoff").split(', ')
                stop["location_name"] = ", ".join(loc_parts[:2]) if len(loc_parts) >= 2 else loc_parts[0]
                stop["reason"] = "Drop-off"
            else:
                # Interpolate position along route
                fraction = stop["cumulative_miles"] / total_route_miles if total_route_miles > 0 else 0
                fraction = min(1.0, max(0.0, fraction))
                point = interpolate_point_on_route(full_route["geometry"], fraction)
                if point:
                    stop["coordinates"] = point
                    # Reverse geocode to get actual city/state for remarks
                    stop["location_name"] = reverse_geocode(point["lat"], point["lng"])
                    # If reason is missing (shouldn't be), set it to stop type
                    if "reason" not in stop:
                        stop["reason"] = stop["type"].capitalize()

        # Step 5: Build response
        response_data = {
            "locations": {
                "current": current_loc,
                "pickup": pickup_loc,
                "dropoff": dropoff_loc,
            },
            "route": {
                "geometry": full_route["geometry"],
                "total_distance_miles": full_route["distance_miles"],
                "total_duration_hours": full_route["duration_hours"],
                "legs": full_route["legs"],
            },
            "trip": trip,
        }

        return Response(response_data)

    except ValueError as e:
        error_msg = str(e)
        if "OSRM" in error_msg or "routing servers failed" in error_msg:
            return Response(
                {"error": f"External routing service is currently unavailable or experiencing heavy load. Please try again soon. Details: {error_msg}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"error": error_msg},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except http_requests.exceptions.RequestException as e:
        return Response(
            {"error": f"External mapping service is currently unavailable or too slow: {str(e)}. Please try again later."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as e:
        return Response(
            {"error": f"An unexpected server error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


PHOTON_URL = "https://photon.komoot.io/api/"


@api_view(["GET"])
def autocomplete(request):
    """
    Location autocomplete using Photon (fuzzy, typo-tolerant).
    GET /api/autocomplete/?q=philadelhia
    Returns up to 5 matching US locations.
    """
    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response([])

    try:
        params = {
            "q": query,
            "limit": 7,
            "lang": "en",
        }
        resp = http_requests.get(PHOTON_URL, params=params, headers=HEADERS, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        suggestions = []
        seen = set()
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            coords = feature.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue

            # Build a readable display name
            name = props.get("name", "")
            city = props.get("city", "")
            state = props.get("state", "")
            country = props.get("country", "")

            parts = [p for p in [name, city, state, country] if p and p != name or p == name]
            # Remove duplicates in parts while keeping order
            unique_parts = []
            for p in [name, city, state, country]:
                if p and p not in unique_parts:
                    unique_parts.append(p)
            display_name = ", ".join(unique_parts) if unique_parts else props.get("name", "Unknown")

            # Deduplicate by display name
            if display_name in seen:
                continue
            seen.add(display_name)

            suggestions.append({
                "display_name": display_name,
                "lat": coords[1],
                "lng": coords[0],
            })

            if len(suggestions) >= 5:
                break

        return Response(suggestions)

    except Exception:
        return Response([])



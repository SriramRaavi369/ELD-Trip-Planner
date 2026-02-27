"""
Hours of Service (HOS) Rules Engine for property-carrying drivers.

FMCSA Rules implemented:
- 11-Hour Driving Limit: May drive max 11 hrs after 10 consecutive hrs off duty.
- 14-Hour Duty Window: Cannot drive beyond 14th consecutive hour after coming on duty.
- 30-Minute Break: Required after 8 cumulative hrs of driving.
- 70-Hour/8-Day Limit: Cannot drive after 70 hrs on duty in 8 consecutive days.
- Fuel stops every 1,000 miles.
- 1 hour for pickup and 1 hour for drop-off.
"""

from datetime import datetime, timedelta
import math

# Constants
MAX_DRIVING_HOURS = 11
MAX_DUTY_WINDOW_HOURS = 14
MANDATORY_BREAK_AFTER_HOURS = 8
MANDATORY_BREAK_DURATION = 0.5  # 30 minutes
OFF_DUTY_RESET_HOURS = 10
MAX_CYCLE_HOURS = 70  # 70-hour/8-day cycle
FUEL_STOP_MILES = 1000
FUEL_STOP_DURATION = 0.5  # 30 min fuel stop
PICKUP_DURATION = 1.0  # 1 hour
DROPOFF_DURATION = 1.0  # 1 hour
AVERAGE_SPEED_MPH = 55  # Conservative average speed for estimation


class DutyStatus:
    OFF_DUTY = "off_duty"
    SLEEPER = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY = "on_duty"


class StopType:
    REST = "rest"
    FUEL = "fuel"
    BREAK = "break"
    PICKUP = "pickup"
    DROPOFF = "dropoff"
    START = "start"


def _new_day_log(dt):
    """Create a new empty day log entry."""
    return {
        "date": dt.strftime("%Y-%m-%d"),
        "day_of_week": dt.strftime("%A"),
        "segments": [],
        "total_hours": {
            DutyStatus.OFF_DUTY: 0,
            DutyStatus.SLEEPER: 0,
            DutyStatus.DRIVING: 0,
            DutyStatus.ON_DUTY: 0,
        },
        "total_miles": 0,
    }


class TripPlanner:
    """Stateful trip planner that manages day logs and duty segments."""

    def __init__(self, start_time, current_cycle_used):
        self.daily_logs = []
        self.current_day_log = _new_day_log(start_time)
        self.stops = []
        self.current_time = start_time
        self.miles_driven_total = 0
        self.miles_at_day_start = 0
        self.miles_since_fuel = 0
        self.driving_hours_today = 0
        self.duty_window_start = start_time
        self.hours_since_break = 0
        self.cycle_hours_used = current_cycle_used

    def add_segment(self, status, start, end):
        """Add a duty status segment, splitting across midnight boundaries."""
        if start >= end:
            return

        current_start = start
        while current_start < end:
            day_boundary = current_start.replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)
            chunk_end = min(end, day_boundary)
            chunk_duration = (chunk_end - current_start).total_seconds() / 3600

            start_hour = current_start.hour + current_start.minute / 60
            end_hour = chunk_end.hour + chunk_end.minute / 60
            if chunk_end == day_boundary:
                end_hour = 24.0

            if chunk_duration > 0:
                self.current_day_log["segments"].append({
                    "status": status,
                    "start_hour": round(start_hour, 2),
                    "end_hour": round(end_hour, 2),
                    "duration_hours": round(chunk_duration, 2),
                })
                self.current_day_log["total_hours"][status] = round(
                    self.current_day_log["total_hours"].get(status, 0) + chunk_duration, 2
                )

            # If we reached midnight, finalize current day and start next
            if chunk_end == day_boundary:
                self.current_day_log["total_miles"] = round(self.miles_driven_total - self.miles_at_day_start, 1)
                self.daily_logs.append(self.current_day_log)
                self.current_day_log = _new_day_log(day_boundary)
                self.miles_at_day_start = self.miles_driven_total

            current_start = chunk_end

    def simulate_driving(self, miles_to_drive, drive_time_hours):
        """Simulate driving with HOS-compliant stops inserted automatically."""
        remaining_miles = miles_to_drive
        avg_speed = miles_to_drive / drive_time_hours if drive_time_hours > 0 else AVERAGE_SPEED_MPH

        while remaining_miles > 0.5:
            # Available time before each constraint
            time_until_break = MANDATORY_BREAK_AFTER_HOURS - self.hours_since_break
            time_until_driving_limit = MAX_DRIVING_HOURS - self.driving_hours_today
            time_until_duty_window = MAX_DUTY_WINDOW_HOURS - (
                (self.current_time - self.duty_window_start).total_seconds() / 3600
            )
            time_until_cycle_limit = MAX_CYCLE_HOURS - self.cycle_hours_used
            miles_until_fuel = FUEL_STOP_MILES - self.miles_since_fuel
            time_until_fuel = miles_until_fuel / avg_speed if avg_speed > 0 else float('inf')

            time_to_finish = remaining_miles / avg_speed

            constraints = {
                "break": max(0, time_until_break),
                "driving_limit": max(0, time_until_driving_limit),
                "duty_window": max(0, time_until_duty_window),
                "cycle_limit": max(0, time_until_cycle_limit),
                "fuel": max(0, time_until_fuel),
            }

            min_constraint_name = min(constraints, key=constraints.get)
            min_drive_time = constraints[min_constraint_name]

            # Can we finish before hitting any constraint?
            if time_to_finish <= min_drive_time + 0.01:
                drive_end = self.current_time + timedelta(hours=time_to_finish)
                self.add_segment(DutyStatus.DRIVING, self.current_time, drive_end)
                miles_driven = time_to_finish * avg_speed
                self.miles_driven_total += miles_driven
                self.miles_since_fuel += miles_driven
                self.driving_hours_today += time_to_finish
                self.hours_since_break += time_to_finish
                self.cycle_hours_used += time_to_finish
                remaining_miles = 0
                self.current_time = drive_end
                break

            # Drive until the constraint
            if min_drive_time > 0.05:
                drive_end = self.current_time + timedelta(hours=min_drive_time)
                self.add_segment(DutyStatus.DRIVING, self.current_time, drive_end)
                miles_driven = min_drive_time * avg_speed
                self.miles_driven_total += miles_driven
                self.miles_since_fuel += miles_driven
                remaining_miles -= miles_driven
                self.driving_hours_today += min_drive_time
                self.hours_since_break += min_drive_time
                self.cycle_hours_used += min_drive_time
                self.current_time = drive_end

            # Handle the constraint
            if min_constraint_name == "fuel":
                fuel_end = self.current_time + timedelta(hours=FUEL_STOP_DURATION)
                self.add_segment(DutyStatus.ON_DUTY, self.current_time, fuel_end)
                self.stops.append({
                    "type": StopType.FUEL,
                    "location_name": "Fuel Stop",
                    "reason": "Fuel Stop",
                    "mile_marker": round(self.miles_driven_total, 1),
                    "arrival_time": self.current_time.isoformat(),
                    "departure_time": fuel_end.isoformat(),
                    "duration_hours": FUEL_STOP_DURATION,
                    "cumulative_miles": round(self.miles_driven_total, 1),
                })
                self.cycle_hours_used += FUEL_STOP_DURATION
                self.current_time = fuel_end
                self.miles_since_fuel = 0

            elif min_constraint_name == "break":
                break_end = self.current_time + timedelta(hours=MANDATORY_BREAK_DURATION)
                self.add_segment(DutyStatus.OFF_DUTY, self.current_time, break_end)
                self.stops.append({
                    "type": StopType.BREAK,
                    "location_name": "30-Min Break",
                    "reason": "30-Min Break",
                    "mile_marker": round(self.miles_driven_total, 1),
                    "arrival_time": self.current_time.isoformat(),
                    "departure_time": break_end.isoformat(),
                    "duration_hours": MANDATORY_BREAK_DURATION,
                    "cumulative_miles": round(self.miles_driven_total, 1),
                })
                self.current_time = break_end
                self.hours_since_break = 0

            elif min_constraint_name in ("driving_limit", "duty_window"):
                # 10-hour rest for daily reset
                rest_end = self.current_time + timedelta(hours=OFF_DUTY_RESET_HOURS)
                self.add_segment(DutyStatus.SLEEPER, self.current_time, rest_end)
                self.stops.append({
                    "type": StopType.REST,
                    "location_name": "10-Hr Rest",
                    "reason": "10-Hr Rest",
                    "mile_marker": round(self.miles_driven_total, 1),
                    "arrival_time": self.current_time.isoformat(),
                    "departure_time": rest_end.isoformat(),
                    "duration_hours": OFF_DUTY_RESET_HOURS,
                    "cumulative_miles": round(self.miles_driven_total, 1),
                })
                self.current_time = rest_end
                self.driving_hours_today = 0
                self.hours_since_break = 0
                self.duty_window_start = self.current_time

            elif min_constraint_name == "cycle_limit":
                # 34-hour restart for 70-hour/8-day cycle reset
                restart_end = self.current_time + timedelta(hours=34)
                self.add_segment(DutyStatus.OFF_DUTY, self.current_time, restart_end)
                self.stops.append({
                    "type": StopType.REST,
                    "location_name": "34-Hr Restart",
                    "reason": "34-Hr Restart",
                    "mile_marker": round(self.miles_driven_total, 1),
                    "arrival_time": self.current_time.isoformat(),
                    "departure_time": restart_end.isoformat(),
                    "duration_hours": 34.0,
                    "cumulative_miles": round(self.miles_driven_total, 1),
                })
                self.current_time = restart_end
                self.driving_hours_today = 0
                self.hours_since_break = 0
                self.duty_window_start = self.current_time
                self.cycle_hours_used = 0


def plan_trip(
    total_distance_miles,
    total_drive_time_hours,
    current_cycle_used,
    start_time=None,
    pickup_distance_miles=0,
    pickup_drive_time_hours=0,
):
    """
    Plan a trip with HOS-compliant stops.

    Returns:
        dict with stops, daily_logs, and trip summary
    """
    if start_time is None:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

    planner = TripPlanner(start_time, current_cycle_used)

    # Fill off-duty from midnight to start time on Day 1
    day_start = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
    if start_time > day_start:
        planner.add_segment(DutyStatus.OFF_DUTY, day_start, start_time)

    # PHASE 1: Start
    planner.stops.append({
        "type": StopType.START,
        "location_name": "Starting Location",
        "reason": "Start",
        "mile_marker": 0,
        "arrival_time": start_time.isoformat(),
        "departure_time": start_time.isoformat(),
        "duration_hours": 0,
        "cumulative_miles": 0,
    })

    # PHASE 2: Drive to Pickup
    if pickup_distance_miles > 0 and pickup_drive_time_hours > 0:
        planner.simulate_driving(pickup_distance_miles, pickup_drive_time_hours)

    # PHASE 3: Pickup (1 hour on duty, not driving)
    pickup_start = planner.current_time
    pickup_end = planner.current_time + timedelta(hours=PICKUP_DURATION)
    planner.add_segment(DutyStatus.ON_DUTY, pickup_start, pickup_end)
    planner.cycle_hours_used += PICKUP_DURATION
    planner.stops.append({
        "type": StopType.PICKUP,
        "location_name": "Pickup Location",
        "mile_marker": round(planner.miles_driven_total, 1),
        "arrival_time": pickup_start.isoformat(),
        "departure_time": pickup_end.isoformat(),
        "duration_hours": PICKUP_DURATION,
        "cumulative_miles": round(planner.miles_driven_total, 1),
    })
    planner.current_time = pickup_end

    # PHASE 4: Drive to Drop-off (main haul)
    planner.simulate_driving(total_distance_miles, total_drive_time_hours)

    # PHASE 5: Drop-off (1 hour on duty, not driving)
    dropoff_start = planner.current_time
    dropoff_end = planner.current_time + timedelta(hours=DROPOFF_DURATION)
    planner.add_segment(DutyStatus.ON_DUTY, dropoff_start, dropoff_end)
    planner.stops.append({
        "type": StopType.DROPOFF,
        "location_name": "Drop-off Location",
        "mile_marker": round(planner.miles_driven_total, 1),
        "arrival_time": dropoff_start.isoformat(),
        "departure_time": dropoff_end.isoformat(),
        "duration_hours": DROPOFF_DURATION,
        "cumulative_miles": round(planner.miles_driven_total, 1),
    })
    planner.current_time = dropoff_end

    # Fill remaining time of last day as off duty
    # Only add if we're not already at midnight (add_segment handles day changes)
    is_at_midnight = (
        planner.current_time.hour == 0
        and planner.current_time.minute == 0
        and planner.current_time.second == 0
    )
    if not is_at_midnight:
        end_of_day = planner.current_time.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        planner.add_segment(DutyStatus.OFF_DUTY, planner.current_time, end_of_day)

    # Finalize last day log (only if it has segments and wasn't already finalized)
    if planner.current_day_log["segments"]:
        planner.current_day_log["total_miles"] = round(planner.miles_driven_total - planner.miles_at_day_start, 1)
        planner.daily_logs.append(planner.current_day_log)

    # Build summary
    trip_end = planner.current_time
    total_trip_hours = (trip_end - start_time).total_seconds() / 3600

    return {
        "stops": planner.stops,
        "daily_logs": planner.daily_logs,
        "summary": {
            "total_distance_miles": round(planner.miles_driven_total, 1),
            "total_trip_hours": round(total_trip_hours, 1),
            "total_driving_hours": round(
                sum(log["total_hours"].get(DutyStatus.DRIVING, 0) for log in planner.daily_logs), 1
            ),
            "number_of_days": len(planner.daily_logs),
            "start_time": start_time.isoformat(),
            "end_time": trip_end.isoformat(),
            "fuel_stops": sum(1 for s in planner.stops if s["type"] == StopType.FUEL),
            "rest_stops": sum(1 for s in planner.stops if s["type"] == StopType.REST),
        },
    }

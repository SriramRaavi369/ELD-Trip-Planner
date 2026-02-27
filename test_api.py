import requests, json

resp = requests.post('http://localhost:8000/api/trip-plan/', json={
    'current_location': 'New York, NY',
    'pickup_location': 'Philadelphia, PA',
    'dropoff_location': 'Philadelphia, PA',
    'current_cycle_used': 10
})
data = resp.json()
if resp.status_code != 200:
    print(f"Error {resp.status_code}: {data}")
    exit(1)

with open('test_output.txt', 'w') as f:
    f.write(f"Status: {resp.status_code}\n")
    f.write(f"Total miles: {data['trip']['summary']['total_distance_miles']}\n")
    f.write(f"Days: {data['trip']['summary']['number_of_days']}\n")
    f.write(f"Fuel stops: {data['trip']['summary']['fuel_stops']}\n")
    f.write(f"Rest stops: {data['trip']['summary']['rest_stops']}\n\n")
    f.write("Stops:\n")
    for s in data['trip']['stops']:
        f.write(f"  {s['type']:8s} | Mile {s['cumulative_miles']:>7} | {s['location_name']}\n")
    f.write("\nDaily logs:\n")
    for i, log in enumerate(data['trip']['daily_logs']):
        f.write(f"  Day {i+1}: {log['date']} ({log['day_of_week']}): {len(log['segments'])} segments\n")
        for k, v in log['total_hours'].items():
            if v > 0:
                f.write(f"    {k}: {v}h\n")

print("Written to test_output.txt")

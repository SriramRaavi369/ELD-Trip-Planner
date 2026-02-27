function TripSummary({ summary }) {
    const stats = [
        {
            icon: '🛣️',
            value: `${summary.total_distance_miles.toLocaleString()}`,
            label: 'Total Miles',
        },
        {
            icon: '⏱️',
            value: `${summary.total_driving_hours}h`,
            label: 'Driving Hours',
        },
        {
            icon: '📅',
            value: summary.number_of_days,
            label: 'Days',
        },
        {
            icon: '⛽',
            value: summary.fuel_stops,
            label: 'Fuel Stops',
        },
        {
            icon: '🛏️',
            value: summary.rest_stops,
            label: 'Rest Stops',
        },
        {
            icon: '🕐',
            value: `${summary.total_trip_hours}h`,
            label: 'Total Trip Time',
        },
    ]

    return (
        <div className="trip-summary">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="summary-stat"
                    style={{ animationDelay: `${i * 0.05}s` }}
                >
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                </div>
            ))}
        </div>
    )
}

export default TripSummary

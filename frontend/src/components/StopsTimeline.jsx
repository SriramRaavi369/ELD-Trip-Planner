const STOP_EMOJIS = {
    start: '📍',
    pickup: '📦',
    dropoff: '🏁',
    fuel: '⛽',
    rest: '🛏️',
    break: '☕',
}

const STOP_DUTY_STATUS = {
    start: 'On Duty',
    pickup: 'On Duty',
    dropoff: 'On Duty',
    fuel: 'On Duty',
    rest: 'Sleeper Berth',
    break: 'Off Duty',
    restart: 'Off Duty',
}

function StopsTimeline({ stops }) {
    return (
        <div className="card">
            <div className="card-header">
                <div className="card-header-icon">🛤️</div>
                <h2>Route Stops</h2>
            </div>
            <div className="stops-timeline">
                {stops.map((stop, i) => {
                    const arrivalTime = stop.arrival_time
                        ? new Date(stop.arrival_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                        })
                        : ''

                    return (
                        <div key={i} className="stop-item">
                            <div className={`stop-icon ${stop.type}`}>
                                {STOP_EMOJIS[stop.type] || '📍'}
                            </div>
                            <div className="stop-details">
                                <div className="stop-name">
                                    {stop.reason || (stop.type ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : 'Stop')}
                                    <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: '8px', fontWeight: '600', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px' }}>
                                        {STOP_DUTY_STATUS[stop.type] || 'On Duty'}
                                    </span>
                                </div>
                                <div className="stop-location" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    {stop.location_name}
                                </div>
                                <div className="stop-meta">
                                    {arrivalTime && <span>🕐 {arrivalTime}</span>}
                                    {stop.duration_hours > 0 && (
                                        <span>⏱️ {stop.duration_hours}h</span>
                                    )}
                                    <span>📏 Mi {stop.cumulative_miles}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default StopsTimeline

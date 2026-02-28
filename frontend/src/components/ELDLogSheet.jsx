import { useRef, useEffect } from 'react'

const STATUS_LABELS = {
    off_duty: '1. Off Duty',
    sleeper_berth: '2. Sleeper Berth',
    driving: '3. Driving',
    on_duty: '4. On Duty (Not Driving)',
}

const STATE_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
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

const formatLocation = (locStr) => {
    if (!locStr) return ''
    const parts = locStr.split(',').map(p => p.trim())
    if (parts.length >= 2) {
        const city = parts[0]
        const state = parts[1]
        const stateAbbr = STATE_ABBR[state] || state
        // If it's literally a two-letter state, keep it. Otherwise just use whatever matched.
        const finalState = stateAbbr.length === 2 ? stateAbbr.toUpperCase() : (STATE_ABBR[state] || state.substring(0, 2).toUpperCase())
        return `${city}, ${finalState}`
    }
    return locStr
}

const STATUS_COLORS = {
    off_duty: '#64748b',
    sleeper_berth: '#7c3aed',
    driving: '#16a34a',
    on_duty: '#d97706',
}

const STATUS_ORDER = ['off_duty', 'sleeper_berth', 'driving', 'on_duty']

function ELDLogSheet({ log, dayNumber, stops, onPrevDay, onNextDay, hasPrev, hasNext }) {
    const canvasRef = useRef(null)

    // Grid dimensions
    const GRID_LEFT = 140
    const GRID_TOP = 80
    const GRID_WIDTH = 624  // 24 hours * 26px per hour
    const ROW_HEIGHT = 44
    const HOUR_WIDTH = 26
    const TOTAL_COL_WIDTH = 60

    const CANVAS_WIDTH = GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH + 20
    const REMARKS_SPACE = 180 // Reduced to remove excess white space, but still fit diagonal lines
    const CANVAS_HEIGHT = GRID_TOP + (ROW_HEIGHT * 4) + REMARKS_SPACE

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        // Set canvas resolution for sharp rendering
        const dpr = window.devicePixelRatio || 1
        canvas.width = CANVAS_WIDTH * dpr
        canvas.height = CANVAS_HEIGHT * dpr
        canvas.style.width = CANVAS_WIDTH + 'px'
        canvas.style.height = CANVAS_HEIGHT + 'px'
        ctx.scale(dpr, dpr)

        // Clear
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Draw header area
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(0, 0, CANVAS_WIDTH, GRID_TOP)

        // Title row
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('Duty Status', 8, GRID_TOP - 48)

        // Hour labels
        ctx.font = '10px Inter, sans-serif'
        ctx.textAlign = 'center'
        const timeLabels = [
            'Mid', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
            'Noon', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', 'Mid'
        ]
        for (let h = 0; h <= 24; h++) {
            const x = GRID_LEFT + h * HOUR_WIDTH
            ctx.fillStyle = 'rgba(255,255,255,0.8)'
            ctx.fillText(timeLabels[h], x, GRID_TOP - 30)

            // AM/PM indicator
            if (h === 6) {
                ctx.fillStyle = 'rgba(255,255,255,0.5)'
                ctx.font = '8px Inter, sans-serif'
                ctx.fillText('AM', GRID_LEFT + 3 * HOUR_WIDTH, GRID_TOP - 18)
                ctx.font = '10px Inter, sans-serif'
            }
            if (h === 18) {
                ctx.fillStyle = 'rgba(255,255,255,0.5)'
                ctx.font = '8px Inter, sans-serif'
                ctx.fillText('PM', GRID_LEFT + 15 * HOUR_WIDTH, GRID_TOP - 18)
                ctx.font = '10px Inter, sans-serif'
            }
        }

        // "Total Hours" header
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.fillText('Total', GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH / 2, GRID_TOP - 30)
        ctx.fillText('Hours', GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH / 2, GRID_TOP - 18)

        // Draw grid rows
        STATUS_ORDER.forEach((status, rowIndex) => {
            const y = GRID_TOP + rowIndex * ROW_HEIGHT

            // Row background
            ctx.fillStyle = rowIndex % 2 === 0 ? '#f8f9fa' : '#ffffff'
            ctx.fillRect(0, y, GRID_LEFT, ROW_HEIGHT)
            ctx.fillStyle = rowIndex % 2 === 0 ? '#fafafa' : '#ffffff'
            ctx.fillRect(GRID_LEFT, y, GRID_WIDTH, ROW_HEIGHT)

            // Status label
            ctx.fillStyle = '#333'
            ctx.font = '11px Inter, sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText(STATUS_LABELS[status], 8, y + ROW_HEIGHT / 2 + 4)

            // Grid lines — hour marks
            for (let h = 0; h <= 24; h++) {
                const x = GRID_LEFT + h * HOUR_WIDTH
                ctx.strokeStyle = '#ccc'
                ctx.lineWidth = h === 0 || h === 12 || h === 24 ? 1.5 : 0.5
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x, y + ROW_HEIGHT)
                ctx.stroke()

                // High-fidelity tick marks (20px half, 10px quarter)
                if (h < 24) {
                    const midX = x + HOUR_WIDTH / 2
                    const q1 = x + HOUR_WIDTH / 4
                    const q3 = x + 3 * HOUR_WIDTH / 4

                    const halfTickLen = 20
                    const quartTickLen = 10

                    ctx.strokeStyle = '#bbb'
                    ctx.lineWidth = 0.8
                    ctx.beginPath()

                    if (rowIndex < 2) {
                        // Top rows: ticks extend DOWN from the top border
                        ctx.moveTo(midX, y); ctx.lineTo(midX, y + halfTickLen)
                        ctx.moveTo(q1, y); ctx.lineTo(q1, y + quartTickLen)
                        ctx.moveTo(q3, y); ctx.lineTo(q3, y + quartTickLen)
                    } else {
                        // Bottom rows: ticks extend UP from the bottom border
                        ctx.moveTo(midX, y + ROW_HEIGHT); ctx.lineTo(midX, y + ROW_HEIGHT - halfTickLen)
                        ctx.moveTo(q1, y + ROW_HEIGHT); ctx.lineTo(q1, y + ROW_HEIGHT - quartTickLen)
                        ctx.moveTo(q3, y + ROW_HEIGHT); ctx.lineTo(q3, y + ROW_HEIGHT - quartTickLen)
                    }
                    ctx.stroke()
                }
            }

            // Row border
            ctx.strokeStyle = '#ddd'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(0, y + ROW_HEIGHT)
            ctx.lineTo(CANVAS_WIDTH, y + ROW_HEIGHT)
            ctx.stroke()

            // Total hours column
            const totalX = GRID_LEFT + GRID_WIDTH
            ctx.fillStyle = '#f0f0f0'
            ctx.fillRect(totalX, y, TOTAL_COL_WIDTH, ROW_HEIGHT)
            ctx.strokeStyle = '#ccc'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(totalX, y)
            ctx.lineTo(totalX, y + ROW_HEIGHT)
            ctx.stroke()

            // Total value
            const totalHours = log.total_hours?.[status] || 0
            ctx.fillStyle = '#111'
            ctx.font = 'bold 13px Inter, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(
                totalHours > 0 ? totalHours.toFixed(1) : '0.0',
                totalX + TOTAL_COL_WIDTH / 2,
                y + ROW_HEIGHT / 2 + 5
            )
        })

        // Outer border
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 2
        ctx.strokeRect(0, GRID_TOP, CANVAS_WIDTH, ROW_HEIGHT * 4)
        ctx.strokeRect(0, 0, CANVAS_WIDTH, GRID_TOP)

        // Draw duty status lines
        if (log.segments) {
            const getDutyY = (rIndex) => {
                const rowY = GRID_TOP + rIndex * ROW_HEIGHT
                return rIndex < 2 ? rowY + 20 : rowY + ROW_HEIGHT - 20
            }

            log.segments.forEach((segment) => {
                const rowIndex = STATUS_ORDER.indexOf(segment.status)
                if (rowIndex === -1) return

                const startX = GRID_LEFT + (segment.start_hour * HOUR_WIDTH)
                const endX = GRID_LEFT + (segment.end_hour * HOUR_WIDTH)
                const lineY = getDutyY(rowIndex)
                const color = STATUS_COLORS[segment.status]

                if (endX - startX < 0.1) return

                // Draw the duty status line (thick)
                ctx.strokeStyle = color
                ctx.lineWidth = 4
                ctx.lineCap = 'round'
                ctx.beginPath()
                ctx.moveTo(startX, lineY)
                ctx.lineTo(endX, lineY)
                ctx.stroke()
            })

            // Draw vertical transition lines & red dots
            let prevSegment = null
            log.segments.forEach((segment, idx) => {
                const rowIndex = STATUS_ORDER.indexOf(segment.status)
                const y = getDutyY(rowIndex)
                const startX = GRID_LEFT + segment.start_hour * HOUR_WIDTH

                if (prevSegment && prevSegment.status !== segment.status) {
                    const prevRowIndex = STATUS_ORDER.indexOf(prevSegment.status)
                    const prevY = getDutyY(prevRowIndex)

                    ctx.strokeStyle = '#333'
                    ctx.lineWidth = 2
                    ctx.beginPath()
                    ctx.moveTo(startX, prevY)
                    ctx.lineTo(startX, y)
                    ctx.stroke()

                    // Dot at transition top
                    ctx.fillStyle = '#ef4444'
                    ctx.beginPath(); ctx.arc(startX, prevY, 4, 0, Math.PI * 2); ctx.fill()
                }

                // Dot at current start
                ctx.fillStyle = '#ef4444'
                ctx.beginPath(); ctx.arc(startX, y, 4, 0, Math.PI * 2); ctx.fill()

                if (idx === log.segments.length - 1) {
                    const endX = GRID_LEFT + segment.end_hour * HOUR_WIDTH
                    ctx.beginPath(); ctx.arc(endX, y, 4, 0, Math.PI * 2); ctx.fill()
                }
                prevSegment = segment
            })
        }

        // Draw Remarks (Diagonal lines with |_| duration brackets)
        if (dayStops.length > 0) {
            const GRID_BOTTOM = GRID_TOP + 4 * ROW_HEIGHT
            ctx.fillStyle = '#3b82f6'
            ctx.font = 'bold 14px Inter, sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText('REMARKS', 10, GRID_BOTTOM + 35)

            dayStops.forEach((stop) => {
                const timePart = stop.arrival_time.split('T')[1] || ''
                const hourMatches = timePart.match(/(\d+):(\d+)/)
                if (!hourMatches) return

                const hours = parseInt(hourMatches[1])
                const mins = parseInt(hourMatches[2])
                const startHours = hours + (mins / 60)
                const startX = GRID_LEFT + startHours * HOUR_WIDTH

                const duration = stop.duration_hours || 0
                const endHours = startHours + duration
                const endX = GRID_LEFT + endHours * HOUR_WIDTH

                ctx.lineWidth = 1.6
                ctx.strokeStyle = '#374151'
                ctx.beginPath()

                const dropDown = 35
                const diagLen = 110 // Longer for better visibility
                const bracketY = GRID_BOTTOM + dropDown

                // Steeper angle (approx 63.4 degrees)
                const angle = Math.atan2(2, 1)

                if (duration > 0.05) {
                    // Draw square bracket |_|
                    ctx.moveTo(startX, GRID_BOTTOM)
                    ctx.lineTo(startX, bracketY)
                    ctx.lineTo(endX, bracketY)
                    ctx.lineTo(endX, GRID_BOTTOM)
                    ctx.stroke()
                } else {
                    // Single point drop
                    ctx.moveTo(startX, GRID_BOTTOM)
                    ctx.lineTo(startX, bracketY)
                    ctx.stroke()
                }

                // Diagonal from START to avoid overlap
                ctx.beginPath()
                ctx.moveTo(startX, bracketY)

                const endDiagX = startX - Math.cos(angle) * diagLen
                const endDiagY = bracketY + Math.sin(angle) * diagLen
                ctx.lineTo(endDiagX, endDiagY)
                ctx.stroke()

                ctx.save()
                ctx.translate(startX, bracketY)
                ctx.rotate(-angle)
                ctx.textAlign = 'right'
                ctx.textBaseline = 'middle'

                const locationStrRaw = stop.location_name || ''
                const locationStr = formatLocation(locationStrRaw)
                const reasonStr = stop.reason || (stop.type ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : 'Stop')

                // Location on TOP (City, State)
                ctx.fillStyle = '#111827'
                ctx.font = 'bold 12px Inter, sans-serif'
                ctx.fillText(locationStr, -15, -10)

                // Reason on BOTTOM (Mile/Reason)
                ctx.fillStyle = '#6b7280'
                ctx.font = '10px Inter, sans-serif'
                ctx.fillText(reasonStr, -15, 10)

                ctx.restore()
            })
        }
    }, [log])

    // Format date
    const dateStr = log.date
        ? new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : `Day ${dayNumber}`

    // Get relevant stops for this day
    const dayStops = stops?.filter((s) => {
        if (!s.arrival_time) return false
        const stopDate = s.arrival_time.split('T')[0]
        return stopDate === log.date
    }) || []

    return (
        <div className="eld-log-sheet animate-fade-in">
            {/* Header */}
            <div className="eld-log-title">
                Drivers Daily Log
                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#888', marginLeft: 12 }}>
                    (24 hours)
                </span>
            </div>
            <div className="eld-log-subtitle">{dateStr}</div>

            <div className="eld-header-row">
                <div className="eld-header-field">
                    <label>Date</label>
                    <span className="value">{log.date}</span>
                </div>
                <div className="eld-header-field">
                    <label>Day</label>
                    <span className="value">Day {dayNumber} — {log.day_of_week}</span>
                </div>
                <div className="eld-header-field">
                    <label>Total Miles Today</label>
                    <span className="value">
                        {dayStops.length > 0
                            ? `${dayStops[dayStops.length - 1]?.cumulative_miles || '—'}`
                            : '—'}
                    </span>
                </div>
            </div>

            {/* Canvas Grid */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
                <button
                    className="eld-side-nav-arrow"
                    onClick={onPrevDay}
                    disabled={!hasPrev}
                    title="Previous Day"
                    style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
                >
                    ◀
                </button>

                <div className="eld-grid-container" style={{ flex: 1, margin: 0 }}>
                    <canvas
                        ref={canvasRef}
                        className="eld-canvas"
                        style={{
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                        }}
                    />
                </div>

                <button
                    className="eld-side-nav-arrow"
                    onClick={onNextDay}
                    disabled={!hasNext}
                    title="Next Day"
                    style={{ visibility: hasNext ? 'visible' : 'hidden' }}
                >
                    ▶
                </button>
            </div>

            {/* Totals Legend */}
            <div className="eld-totals-row">
                {STATUS_ORDER.map((status) => (
                    <div key={status} className="eld-total-item">
                        <div className={`eld-total-dot ${status}`}></div>
                        <span style={{ fontWeight: 600 }}>
                            {(log.total_hours?.[status] || 0).toFixed(1)}h
                        </span>
                        <span style={{ color: '#888', fontSize: '0.75rem' }}>
                            {STATUS_LABELS[status].replace(/^\d+\.\s*/, '')}
                        </span>
                    </div>
                ))}
            </div>

            {/* Remarks */}
            {dayStops.length > 0 && (
                <div className="eld-remarks">
                    <h4>Remarks</h4>
                    {dayStops.map((stop, i) => {
                        const time = new Date(stop.arrival_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                        })
                        const formattedLoc = formatLocation(stop.location_name)
                        const reason = stop.reason || (stop.type ? stop.type.charAt(0).toUpperCase() + stop.type.slice(1) : 'Stop')
                        const dStatus = STOP_DUTY_STATUS[stop.type] || 'On Duty'

                        return (
                            <div key={i} style={{ marginBottom: 4 }}>
                                {time} — <strong>{reason}</strong> <span style={{ color: '#6b7280', fontSize: '0.85em' }}>({dStatus})</span>
                                {stop.location_name && stop.location_name !== stop.reason ? ` at ${formattedLoc}` : ''}
                                {stop.duration_hours > 0 ? ` [${stop.duration_hours}h]` : ''}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ELDLogSheet

import { useRef, useEffect } from 'react'

const STATUS_LABELS = {
    off_duty: '1. Off Duty',
    sleeper_berth: '2. Sleeper Berth',
    driving: '3. Driving',
    on_duty: '4. On Duty\n(not driving)',
}

const STATUS_ORDER = ['off_duty', 'sleeper_berth', 'driving', 'on_duty']

const STATE_MAP = {
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
};

const abbreviateLocation = (loc) => {
    if (!loc) return '';
    // Handle cases like "City, State, Country" or just "City, State"
    let parts = loc.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        const city = parts[0];
        const state = parts[1];
        const stateAbbr = STATE_MAP[state] || state;
        // Ensure we only use 2-character abbreviations
        const finalState = (stateAbbr.length === 2) ? stateAbbr.toUpperCase() : (STATE_MAP[state] || state.substring(0, 2).toUpperCase());
        return `${city}, ${finalState}`;
    }
    return loc;
};

function PaperLogSheet({ log, dayNumber, stops, tripInfo }) {
    const canvasRef = useRef(null)

    // Grid dimensions - Exactly matching the paper style proportions
    const HEADER_HEIGHT = 34
    const GRID_LEFT = 95 // Reduced from 140 to tighten space on the left
    const GRID_TOP = HEADER_HEIGHT
    const GRID_WIDTH = 768
    const ROW_HEIGHT = 28
    const HOUR_WIDTH = 32
    const TOTAL_COL_WIDTH = 80

    const CANVAS_WIDTH = GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH
    const REMARKS_HEIGHT = 220
    const CANVAS_HEIGHT = GRID_TOP + (ROW_HEIGHT * 4) + REMARKS_HEIGHT

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        const dpr = 2
        canvas.width = CANVAS_WIDTH * dpr
        canvas.height = CANVAS_HEIGHT * dpr
        canvas.style.width = CANVAS_WIDTH + 'px'
        canvas.style.height = CANVAS_HEIGHT + 'px'
        ctx.scale(dpr, dpr)

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        // Draw Black Header Background
        ctx.fillStyle = '#000000'
        const headerStartX = GRID_LEFT - 20 // Stretch left slightly for margin (tuned down)
        const headerWidth = GRID_WIDTH + TOTAL_COL_WIDTH + 30 // Expand width accordingly
        ctx.fillRect(headerStartX, 0, headerWidth, HEADER_HEIGHT)

        // Draw Text inside Black Header
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 11px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const headerY = HEADER_HEIGHT / 2

        // Mid-night at start (Centered inside the extended black box on the left)
        ctx.textAlign = 'left'
        ctx.fillText('Mid-', headerStartX + 5, headerY - 5)
        ctx.fillText('night', headerStartX + 5, headerY + 7)

        ctx.textAlign = 'center'
        for (let h = 1; h <= 23; h++) {
            const x = GRID_LEFT + h * HOUR_WIDTH
            let label = h === 12 ? 'Noon' : (h > 12 ? h - 12 : h)
            ctx.fillText(label, x, headerY)
        }

        // Mid-night at end of 24 hours
        ctx.fillText('Mid-', GRID_LEFT + GRID_WIDTH, headerY - 5)
        ctx.fillText('night', GRID_LEFT + GRID_WIDTH, headerY + 7)

        // Total Hours
        ctx.fillText('Total', GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH / 2, headerY - 5)
        ctx.fillText('Hours', GRID_LEFT + GRID_WIDTH + TOTAL_COL_WIDTH / 2, headerY + 7)

        // Reset text baseline
        ctx.textBaseline = 'alphabetic'

        // 1. Draw GRID ROWS (Black/White Style)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1.2

        STATUS_ORDER.forEach((status, rowIndex) => {
            const y = GRID_TOP + rowIndex * ROW_HEIGHT

            // Status Label
            ctx.fillStyle = '#000000'
            ctx.font = 'bold 12px Arial, sans-serif'
            ctx.textAlign = 'left'

            if (status === 'on_duty') {
                ctx.fillText('4. On Duty', 10, y + ROW_HEIGHT / 2 - 2)
                ctx.font = '10px Arial, sans-serif'
                ctx.fillText('(not driving)', 10, y + ROW_HEIGHT / 2 + 10)
            } else if (status === 'sleeper_berth') {
                ctx.fillText('2. Sleeper', 10, y + ROW_HEIGHT / 2 - 2)
                ctx.fillText('Berth', 22, y + ROW_HEIGHT / 2 + 10)
            } else {
                ctx.fillText(STATUS_LABELS[status], 10, y + ROW_HEIGHT / 2 + 5)
            }

            // Main Horizontal lines separating rows
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(GRID_LEFT + GRID_WIDTH, y)

            if (rowIndex === 3) {
                ctx.moveTo(0, y + ROW_HEIGHT)
                ctx.lineTo(GRID_LEFT + GRID_WIDTH, y + ROW_HEIGHT)
            }
            ctx.stroke()

            ctx.strokeStyle = '#000000' // Restore black for vertical lines

            // Vertical lines for hours
            for (let h = 0; h <= 24; h++) {
                const x = GRID_LEFT + h * HOUR_WIDTH
                ctx.lineWidth = 1.2
                ctx.beginPath()
                ctx.moveTo(x, y)
                ctx.lineTo(x, y + ROW_HEIGHT)
                ctx.stroke()

                // Quarter and Half-hour tick marks (Top/Bottom aligned style)
                ctx.lineWidth = 0.6
                const midX = x + HOUR_WIDTH / 2
                const q1 = x + HOUR_WIDTH / 4
                const q3 = x + 3 * HOUR_WIDTH / 4

                // Lengths matching the user's explicit request
                const halfTickLen = 20
                const quartTickLen = 10

                if (h < 24) {
                    ctx.beginPath()

                    if (rowIndex < 2) {
                        // Top two rows: ticks extend DOWN from the top border
                        ctx.moveTo(midX, y)
                        ctx.lineTo(midX, y + halfTickLen)

                        ctx.moveTo(q1, y)
                        ctx.lineTo(q1, y + quartTickLen)

                        ctx.moveTo(q3, y)
                        ctx.lineTo(q3, y + quartTickLen)
                    } else {
                        // Bottom two rows: ticks extend UP from the bottom border
                        ctx.moveTo(midX, y + ROW_HEIGHT)
                        ctx.lineTo(midX, y + ROW_HEIGHT - halfTickLen)

                        ctx.moveTo(q1, y + ROW_HEIGHT)
                        ctx.lineTo(q1, y + ROW_HEIGHT - quartTickLen)

                        ctx.moveTo(q3, y + ROW_HEIGHT)
                        ctx.lineTo(q3, y + ROW_HEIGHT - quartTickLen)
                    }

                    ctx.stroke()
                }
            }

            // Total Column (No vertical borders, just underline)
            const totalX = GRID_LEFT + GRID_WIDTH

            // Draw underline for total hours
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.moveTo(totalX + 10, y + ROW_HEIGHT - 6)
            ctx.lineTo(totalX + TOTAL_COL_WIDTH - 5, y + ROW_HEIGHT - 6)
            ctx.stroke()

            const totalHours = log.total_hours?.[status] || 0
            ctx.fillStyle = '#000000'
            ctx.font = 'bold 15px Arial, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(totalHours.toFixed(1), totalX + TOTAL_COL_WIDTH / 2, y + ROW_HEIGHT / 2 + 5)
        })

        // Draw Left outer Border
        ctx.beginPath()
        ctx.moveTo(1, GRID_TOP)
        ctx.lineTo(1, GRID_TOP + 4 * ROW_HEIGHT)
        ctx.stroke()

        // 2. Draw DUTY LINES
        if (log.segments) {

            // Helper to determine the Y-coordinate for the duty line based on row index
            // Top two rows (0, 1): Ticks extend 20px down from the top border. Line goes at rowTopY + 20
            // Bottom two rows (2, 3): Ticks extend 20px up from the bottom border. Line goes at rowTopY + ROW_HEIGHT - 20
            const getDutyY = (rowIndex) => {
                const rowTopY = GRID_TOP + rowIndex * ROW_HEIGHT
                return rowIndex < 2 ? rowTopY + 20 : rowTopY + ROW_HEIGHT - 20
            }

            // First pass: Draw the bold black connecting lines
            ctx.lineWidth = 3
            ctx.strokeStyle = '#111111' // Dark black

            log.segments.forEach((segment, idx) => {
                const rowIndex = STATUS_ORDER.indexOf(segment.status)
                if (rowIndex === -1) return

                const startX = GRID_LEFT + (segment.start_hour * HOUR_WIDTH)
                const endX = GRID_LEFT + (segment.end_hour * HOUR_WIDTH)
                const y = getDutyY(rowIndex)

                ctx.beginPath()
                ctx.moveTo(startX, y)
                ctx.lineTo(endX, y)
                ctx.stroke()

                // Vertical transitions
                if (idx > 0) {
                    const prevRowIndex = STATUS_ORDER.indexOf(log.segments[idx - 1].status)
                    const prevY = getDutyY(prevRowIndex)
                    ctx.beginPath()
                    ctx.moveTo(startX, prevY)
                    ctx.lineTo(startX, y)
                    ctx.stroke()
                }
            })

            // Second pass: Draw red dots at the nodes connecting the segments
            ctx.fillStyle = '#e11d48' // Red dots

            log.segments.forEach((segment, idx) => {
                const rowIndex = STATUS_ORDER.indexOf(segment.status)
                if (rowIndex === -1) return

                const startX = GRID_LEFT + (segment.start_hour * HOUR_WIDTH)
                const y = getDutyY(rowIndex)

                // Dot at the start of the current horizontal segment
                ctx.beginPath()
                ctx.arc(startX, y, 4, 0, 2 * Math.PI)
                ctx.fill()

                // If there was a vertical drop, we also need a dot at the TOP/BOTTOM of that drop 
                // (which corresponds to the end of the previous segment)
                if (idx > 0) {
                    const prevRowIndex = STATUS_ORDER.indexOf(log.segments[idx - 1].status)
                    const prevY = getDutyY(prevRowIndex)

                    // Only draw if we actually changed rows (vertical drop exists)
                    if (prevY !== y) {
                        ctx.beginPath()
                        ctx.arc(startX, prevY, 4, 0, 2 * Math.PI)
                        ctx.fill()
                    }
                }
            })

            // Draw last dot at the very end of the final segment
            if (log.segments.length > 0) {
                const lastSegment = log.segments[log.segments.length - 1]
                const rowIndex = STATUS_ORDER.indexOf(lastSegment.status)
                if (rowIndex !== -1) {
                    const endX = GRID_LEFT + (lastSegment.end_hour * HOUR_WIDTH)
                    const y = getDutyY(rowIndex)
                    ctx.beginPath()
                    ctx.arc(endX, y, 4, 0, 2 * Math.PI)
                    ctx.fill()
                }
            }
        }

        // 3. Draw Remarks (Diagonal lines with |_| duration brackets)
        if (stops && stops.length > 0) {
            const GRID_BOTTOM = GRID_TOP + 4 * ROW_HEIGHT

            // (Text heading removed - now handled by HTML below)

            // Filter stops for this specific day
            const dayStops = stops.filter(s => s.arrival_time && s.arrival_time.split('T')[0] === log.date)

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

                ctx.lineWidth = 1.8
                ctx.strokeStyle = '#222222'
                ctx.beginPath()

                const dropDown = 75 // Increased to push text down further
                const diagLen = 70 // Shorter to stay clear of docs
                const bracketY = GRID_BOTTOM + dropDown

                // Even steeper angle (approx 71.5 degrees) to avoid horizontal collisions
                const angle = Math.atan2(3, 1)

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

                // Diagonal line from the START of the bracket
                ctx.beginPath()
                ctx.moveTo(startX, bracketY)

                const endDiagX = startX - Math.cos(angle) * diagLen
                const endDiagY = bracketY + Math.sin(angle) * diagLen
                ctx.lineTo(endDiagX, endDiagY)
                ctx.stroke()

                // Rotated text (Human readable)
                ctx.save()
                ctx.translate(startX, bracketY)
                ctx.rotate(-angle)

                ctx.textAlign = 'right'
                ctx.textBaseline = 'middle'

                const locationStrRaw = stop.location_name || ''
                const locationStr = abbreviateLocation(locationStrRaw)
                const reasonStr = stop.reason || (stop.type ? (stop.type.charAt(0).toUpperCase() + stop.type.slice(1)) : 'Stop')

                // (Reason on top, Location on bottom for the diagonal)
                ctx.fillStyle = '#111111'
                ctx.font = 'bold 11px Arial, sans-serif'
                ctx.fillText(locationStr, -5, -8)

                ctx.fillStyle = '#444444'
                ctx.font = '9px Arial, sans-serif'
                ctx.fillText(reasonStr, -5, 8)

                ctx.restore()
            })
        }

    }, [log, stops])

    const dateArr = log.date ? log.date.split('-') : []
    const month = dateArr[1] || 'MM'
    const day = dateArr[2] || 'DD'
    const year = dateArr[0] || 'YYYY'

    return (
        <div className="fmcsa-log-container">
            {/* Header restored exactly from trucking pdf.pdf style */}
            <div className="fmcsa-header">
                <div className="fmcsa-title-row">
                    <div className="main-title-block">
                        <h1>Drivers Daily Log</h1>
                        <span className="subtitle">(24 hours)</span>
                    </div>

                    <div className="date-selection-row">
                        <div className="date-field-simple">
                            <span className="value">{month}</span>
                            <label>(month)</label>
                        </div>
                        <span className="date-sep">/</span>
                        <div className="date-field-simple">
                            <span className="value">{day}</span>
                            <label>(day)</label>
                        </div>
                        <span className="date-sep">/</span>
                        <div className="date-field-simple">
                            <span className="value">{year}</span>
                            <label>(year)</label>
                        </div>
                    </div>

                    <div className="log-copy-details">
                        <strong>Original</strong> - File at home terminal.<br />
                        <strong>Duplicate</strong> - Driver retains in his/her possession for 8 days.
                    </div>
                </div>

                <div className="fmcsa-from-to-row">
                    <div className="input-line-group">
                        <label>From:</label>
                        <span className="line-value">{tripInfo?.from || ''}</span>
                    </div>
                    <div className="input-line-group" style={{ marginLeft: '20px' }}>
                        <label>To:</label>
                        <span className="line-value">{tripInfo?.to || ''}</span>
                    </div>
                </div>

                <div className="fmcsa-details-grid">
                    <div className="details-col-left">
                        <div className="miles-boxes-row">
                            <div className="mile-entry-box">
                                <span className="val">{log.total_miles || ''}</span>
                                <label>Total Miles Driving Today</label>
                            </div>
                            <div className="mile-entry-box" style={{ marginLeft: '-2px' }}>
                                <span className="val">{log.total_miles || ''}</span>
                                <label>Total Mileage Today</label>
                            </div>
                        </div>
                        <div className="truck-info-full-box">
                            <span className="val">{tripInfo?.truck_info || ''}</span>
                            <label>Truck/Tractor and Trailer Numbers or License Plate(s)/State (show each unit)</label>
                        </div>
                    </div>

                    <div className="details-col-right">
                        <div className="carrier-info-line">
                            <span className="val">{tripInfo?.carrierName || ''}</span>
                            <label>Name of Carrier or Carriers</label>
                        </div>
                        <div className="carrier-info-line">
                            <span className="val">Main Street, USA</span>
                            <label>Main Office Address</label>
                        </div>
                        <div className="carrier-info-line">
                            <span className="val">{tripInfo?.homeTerminal || ''}</span>
                            <label>Home Terminal Address</label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fmcsa-grid-section" style={{ border: 'none', marginBottom: '20px', marginTop: '20px', paddingLeft: '20px' }}>
                <div>
                    <canvas ref={canvasRef} />
                </div>
            </div>

            {/* Structured HTML Remarks Box (L-Shape) */}
            <div className="fmcsa-remarks-container">
                <div className="fmcsa-remarks-box">
                    <h2>Remarks</h2>
                    <div className="remarks-drawing-area">
                        {/* Space for dynamic diagonal lines from canvas */}
                    </div>

                    <div className="shipping-docs-section">
                        <h3>Shipping<br />Documents:</h3>
                        <div className="shipping-field manifest-no">
                            <span className="line-val">{tripInfo?.loadNumber || ''}</span>
                            <label>DVL or Manifest No.<br />or</label>
                        </div>
                        <div className="shipping-field shipper-commod">
                            <span className="line-val">{tripInfo?.shipper || ''} {tripInfo?.commodity ? `& ${tripInfo.commodity}` : ''}</span>
                            <label>Shipper & Commodity</label>
                        </div>
                    </div>
                </div>

                <div className="fmcsa-footer-split-line">
                    <span className="divider-line"></span>
                    <p className="footer-instruction">
                        Enter name of place you reported and where released from work and when and where each change of duty occurred.<br />
                        Use time standard of home terminal.
                    </p>
                    <span className="divider-line"></span>
                </div>

                {/* Schneider-Styled Recap Table */}
                <div className="recap-table-area schneider-style">
                    <div className="recap-col-meta">
                        <strong>Recap:</strong><br />Complete at<br />end of day
                    </div>

                    <div className="recap-col-hours">
                        <span className="recap-line"></span>
                        <label>On duty hours today, Total lines 3 & 4</label>
                    </div>

                    <div className="recap-driver-type">
                        <div className="recap-header"><strong>70 Hour/8 Day Drivers</strong></div>
                        <div className="recap-entries">
                            <div className="recap-entry">
                                <label className="letter">A.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours on duty last 7 days including today.</p>
                            </div>
                            <div className="recap-entry">
                                <label className="letter">B.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours available tomorrow 70 hr. minus A*</p>
                            </div>
                            <div className="recap-entry">
                                <label className="letter">C.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours on duty last 8 days including today.</p>
                            </div>
                        </div>
                    </div>

                    <div className="recap-driver-type">
                        <div className="recap-header"><strong>60 Hour/7 Day Drivers</strong></div>
                        <div className="recap-entries">
                            <div className="recap-entry">
                                <label className="letter">A.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours on duty last 8 days including today.</p>
                            </div>
                            <div className="recap-entry">
                                <label className="letter">B.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours available tomorrow 60 hr. minus A*</p>
                            </div>
                            <div className="recap-entry">
                                <label className="letter">C.</label>
                                <span className="underline"></span>
                                <p className="desc">Total hours on duty last 7 days including today.</p>
                            </div>
                        </div>
                    </div>

                    <div className="recap-restart-note">
                        *If you took 34 consecutive hours off duty you have 60/70 hours available
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaperLogSheet;

import { useState } from 'react'
import { MapPin, Clock, Timer, Rocket } from 'lucide-react'
import LocationInput from './LocationInput'

// Get default start time (current hour, rounded)
const getDefaultStartTime = () => {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const pad = (n) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function TripForm({ onSubmit, loading }) {
    const [formData, setFormData] = useState({
        current_location: '',
        pickup_location: '',
        dropoff_location: '',
        current_cycle_used: 0,
        start_time: getDefaultStartTime(),
    })
    const [useSystemTime, setUseSystemTime] = useState(true)
    const [showValidation, setShowValidation] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'current_cycle_used' ? parseFloat(value) : value,
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!isValid) {
            setShowValidation(true)
            return
        }
        setShowValidation(false)
        onSubmit(formData)
    }

    const isValid =
        formData.current_location.trim() &&
        formData.pickup_location.trim() &&
        formData.dropoff_location.trim()

    return (
        <form onSubmit={handleSubmit}>
            <div className="card">
                <div className="card-header">
                    <div className="card-header-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={20} color="var(--accent-primary)" />
                    </div>
                    <h2>Trip Details</h2>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="current_location">
                        Current Location
                    </label>
                    <LocationInput
                        id="current_location"
                        name="current_location"
                        placeholder="e.g. New York, NY"
                        value={formData.current_location}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        error={showValidation && !formData.current_location.trim()}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="pickup_location">
                        Pickup Location
                    </label>
                    <LocationInput
                        id="pickup_location"
                        name="pickup_location"
                        placeholder="e.g. Philadelphia, PA"
                        value={formData.pickup_location}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        error={showValidation && !formData.pickup_location.trim()}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="dropoff_location">
                        Drop-off Location
                    </label>
                    <LocationInput
                        id="dropoff_location"
                        name="dropoff_location"
                        placeholder="e.g. Los Angeles, CA"
                        value={formData.dropoff_location}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        error={showValidation && !formData.dropoff_location.trim()}
                    />
                </div>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
                <div className="card-header">
                    <div className="card-header-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={20} color="var(--accent-primary)" />
                    </div>
                    <div className="start-time-header">
                        <h2>Start Time</h2>
                        <label className="time-toggle" title="Use current system time">
                            <span className="time-toggle-label">System Time</span>
                            <div className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={useSystemTime}
                                    disabled={loading}
                                    onChange={(e) => {
                                        const checked = e.target.checked
                                        setUseSystemTime(checked)
                                        if (checked) {
                                            setFormData(prev => ({
                                                ...prev,
                                                start_time: getDefaultStartTime()
                                            }))
                                        }
                                    }}
                                />
                                <span className="slider round"></span>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="start_time">
                        {useSystemTime ? "Planning trip starting right now" : "When do you want to start?"}
                    </label>
                    <input
                        id="start_time"
                        name="start_time"
                        type="datetime-local"
                        className={`form-input ${useSystemTime ? 'input-disabled' : ''}`}
                        value={formData.start_time}
                        onChange={handleChange}
                        disabled={useSystemTime || loading}
                    />
                    <div className="form-hint">
                        {useSystemTime
                            ? "Toggle off to plan a trip for a future date/time"
                            : "Select a custom future date and time"}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1rem' }}>
                <div className="card-header">
                    <div className="card-header-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Timer size={20} color="var(--accent-primary)" />
                    </div>
                    <div className="cycle-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <h2>Current Cycle</h2>
                        <div className="cycle-stepper">
                            <button
                                type="button"
                                className="cycle-btn"
                                disabled={loading}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    current_cycle_used: Math.max(0, prev.current_cycle_used - 0.5)
                                }))}
                            >−</button>
                            <button
                                type="button"
                                className="cycle-btn"
                                disabled={loading}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    current_cycle_used: Math.min(70, prev.current_cycle_used + 0.5)
                                }))}
                            >+</button>
                        </div>
                    </div>
                </div>

                <div className="cycle-display">
                    <span className="cycle-value">{formData.current_cycle_used} {formData.current_cycle_used <= 1 ? 'Hr' : 'Hrs'}</span>
                    <span className="cycle-max">of 70h used</span>
                </div>
                <input
                    type="range"
                    name="current_cycle_used"
                    className="form-range"
                    min="0"
                    max="70"
                    step="0.5"
                    value={formData.current_cycle_used}
                    onChange={handleChange}
                    disabled={loading}
                />
                <div className="form-hint">
                    Hours used in current 70-hour/8-day cycle
                </div>
            </div>

            <button
                type="submit"
                className={`btn-submit ${!isValid && !loading ? 'btn-invalid' : ''}`}
                disabled={loading}
                style={{ marginTop: '1rem' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Planning Route...
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Rocket size={18} /> Plan My Trip
                    </div>
                )}
            </button>

            {showValidation && !isValid && (
                <div className="validation-error">
                    <span>⚠️</span> Please fill in all location details to proceed further
                </div>
            )}
        </form>
    )
}

export default TripForm

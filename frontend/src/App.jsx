import { useState, useEffect, useRef } from 'react'
import { Truck, Moon, Sun, ClipboardList, Map as MapIcon, FileCheck } from 'lucide-react'
import axios from 'axios'
import TripForm from './components/TripForm'
import RouteMap from './components/RouteMap'
import TripSummary from './components/TripSummary'
import StopsTimeline from './components/StopsTimeline'
import ELDLogSheet from './components/ELDLogSheet'
import PaperLogSheet from './components/PaperLogSheet'
import LogDetailsForm from './components/LogDetailsForm'
import html2canvas from 'html2canvas'
import { generateTripPDF, createDriverData } from './utils/pdfGenerator'
import './App.css'
import './Preview.css'
import LoadingAnimation from './components/LoadingAnimation'

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const LOADING_MESSAGES = [
    { icon: '📍', text: 'Geocoding locations...' },
    { icon: '🗺️', text: 'Calculating optimal route...' },
    { icon: '⏱️', text: 'Applying HOS rules (11h/14h/70h)...' },
    { icon: '⛽', text: 'Scheduling rest & fuel stops...' },
    { icon: '📋', text: 'Generating ELD daily logs...' },
]

const INITIAL_LOG_METADATA = {
    carrierName: "Schneider National Carriers, Inc.",
    homeTerminal: "Green Bay, WI",
    truckNumber: "Truck #101 / Trailer #503",
    shipper: "Don's Paper Co.",
    commodity: "Paper products",
    loadNumber: "ST13241564"
}

function InteractiveLoading() {
    const [msgIndex, setMsgIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex((prev) => Math.min(prev + 1, LOADING_MESSAGES.length - 1))
        }, 800) // Change message every 800ms
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="interactive-loading-wrapper animate-fade-in">
            <div className="truck-loader-container">
                <div className="truck-icon-pulse">🚛</div>
            </div>
            <div className="loading-steps-container">
                {LOADING_MESSAGES.map((msg, i) => (
                    <div
                        key={i}
                        className={`loading-step ${i === msgIndex ? 'active' : ''} ${i < msgIndex ? 'done' : ''} ${i > msgIndex ? 'pending' : ''}`}
                    >
                        <span className="step-icon">{i < msgIndex ? '✅' : msg.icon}</span>
                        <span className="step-text">{msg.text}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function App() {
    const [tripData, setTripData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [infoMsg, setInfoMsg] = useState(null)
    const [activeDay, setActiveDay] = useState(0)
    const [logMetadata, setLogMetadata] = useState(INITIAL_LOG_METADATA)
    const [lastFormData, setLastFormData] = useState(null)
    const [theme, setTheme] = useState('dark')
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)

    // Animation state
    const [showAnimation, setShowAnimation] = useState(false)
    const [isBursting, setIsBursting] = useState(false)
    const [activeMobileTab, setActiveMobileTab] = useState('plan') // 'plan', 'route', 'logs'

    // Fix for Leaflet Map resizing when the tab changes (Map goes from display:none to display:block)
    useEffect(() => {
        if (activeMobileTab === 'route') {
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
        }
    }, [activeMobileTab])

    // Refs for scrolling
    const routeStopsRef = useRef(null)
    const logDetailsRef = useRef(null)

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        if (tripData && routeStopsRef.current) {
            // Slight delay to ensure DOM updates and animations start
            setTimeout(() => {
                routeStopsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 300)
        }
    }, [tripData])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }

    const handleSubmit = async (formData) => {
        // Prevent redundant API calls if inputs haven't changed
        if (lastFormData && JSON.stringify(formData) === JSON.stringify(lastFormData) && tripData) {
            setInfoMsg('Trip already planned with these details!')
            setTimeout(() => setInfoMsg(null), 3000)
            return
        }

        setLoading(true)
        setError(null)
        setInfoMsg(null)
        setTripData(null) // Clear old output immediately
        setShowAnimation(true)
        setIsBursting(false)

        const animationStartTime = Date.now()

        try {
            // Keep the previous data visible underneath if desired, or clear it
            // We'll clear it for a clean sweep when the new data arrives
            const response = await axios.post(`${API_BASE_URL}/api/trip-plan/`, formData)

            // Ensure minimum 2 seconds of zoom animation so it actually drives towards the screen
            const elapsed = Date.now() - animationStartTime;
            if (elapsed < 2000) {
                await new Promise(res => setTimeout(res, 2000 - elapsed));
            }

            // Trigger burst animation
            setIsBursting(true);

            // Wait for the burst to finish (shatter animation is 0.8s, we wait 0.8s)
            setTimeout(() => {
                setTripData(response.data)
                setLastFormData(formData)
                setActiveDay(0)
                setLoading(false)
                setShowAnimation(false)
                setIsBursting(false)
            }, 800);

        } catch (err) {
            const message = err.response?.data?.error || err.message || 'Something went wrong'
            setError(message)
            setLoading(false)
            setShowAnimation(false)
            setIsBursting(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!tripData) return

        setIsGeneratingPdf(true)
        try {
            await generateTripPDF({ trip: tripData.trip })
        } catch (err) {
            console.error('Failed to generate PDF:', err)
            setInfoMsg('Failed to generate PDF. Please try again.')
            setTimeout(() => setInfoMsg(null), 3000)
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    return (
        <>
            {/* Header */}
            <header className="header">
                <div className="header-logo">
                    <div className="header-logo-icon">
                        <Truck size={24} color="white" />
                    </div>
                    <div>
                        <h1>ELD Trip Planner</h1>
                        <span>by Spotter AI</span>
                    </div>
                </div>
                <div className="header-controls">
                    <label className="time-toggle" title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
                        <span className="time-toggle-label" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {theme === 'dark' ? <>🌙 Dark</> : <>☀️ Light</>}
                        </span>
                        <div className="toggle-switch theme-toggle">
                            <input
                                type="checkbox"
                                checked={theme === 'light'}
                                onChange={toggleTheme}
                            />
                            <span className="slider round"></span>
                        </div>
                    </label>
                    <div className="header-badge">● HOS Compliant</div>
                </div>
            </header>

            {/* Main Layout */}
            <div className={`app-container mobile-tab-${activeMobileTab}`}>
                <div className="app-layout">
                    {/* Sidebar - Form */}
                    <aside className="sidebar">
                        <TripForm onSubmit={handleSubmit} loading={loading} />
                        {error && (
                            <div className="error-banner animate-fade-in">
                                ⚠️ {error}
                            </div>
                        )}
                        {infoMsg && (
                            <div className="info-banner animate-fade-in" style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '12px 16px',
                                color: 'var(--accent-primary)',
                                fontSize: '0.85rem',
                                marginTop: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                ℹ️ {infoMsg}
                            </div>
                        )}
                        {tripData && (
                            <div className="trip-results animate-fade-in" ref={routeStopsRef}>
                                <StopsTimeline stops={tripData.trip.stops} />
                            </div>
                        )}

                    </aside>

                    {/* Main Content */}
                    <main className="main-content" style={{ position: 'relative' }}>
                        <LoadingAnimation isVisible={showAnimation} isBursting={isBursting} />

                        {!tripData && !loading && (
                            <div className="welcome-screen animate-fade-in">
                                <h2>Plan Your Trip</h2>
                                <p>
                                    Enter your trip details to get HOS-compliant route planning
                                    with automated ELD daily log sheets.
                                </p>
                                <div className="welcome-features">
                                    <div className="welcome-feature">
                                        <div className="welcome-feature-icon">📍</div>
                                        <h3>Route Planning</h3>
                                        <p>Optimal stops for rest & fuel</p>
                                    </div>
                                    <div className="welcome-feature">
                                        <div className="welcome-feature-icon">⏱️</div>
                                        <h3>HOS Rules</h3>
                                        <p>11hr / 14hr / 70hr compliant</p>
                                    </div>
                                    <div className="welcome-feature">
                                        <div className="welcome-feature-icon">📋</div>
                                        <h3>ELD Logs</h3>
                                        <p>Auto-generated daily logs</p>
                                    </div>
                                </div>

                                {/* Animated PDF Preview Suggestion */}
                                <div className="welcome-preview-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                                    <div className="preview-log-sheets">
                                        <div className="preview-sheet sheet-3"></div>
                                        <div className="preview-sheet sheet-2"></div>
                                        <div className="preview-sheet sheet-1">
                                            <img src="/filled-paper-log.png" alt="Filled Paper Log" className="preview-log-img" />
                                        </div>
                                    </div>
                                    <div className="preview-text">
                                        <h3>Ready to Print & Go</h3>
                                        <p>Your complete trip plan and FMCSA-compliant daily log sheets are automatically generated into a perfect, ready-to-download PDF format.</p>
                                        <div className="preview-hint">✨ Just enter details to try it!</div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {loading && (
                            <div className="loading-card animate-fade-in">
                                <InteractiveLoading />
                            </div>
                        )}

                        {tripData && (
                            <>
                                {/* Trip Summary Stats */}
                                <div className="trip-summary-section animate-fade-in-up">
                                    <TripSummary summary={tripData.trip.summary} />
                                </div>

                                {/* Map */}
                                <div className="map-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                    <div className="map-container">
                                        <RouteMap
                                            route={tripData.route}
                                            stops={tripData.trip.stops}
                                            locations={tripData.locations}
                                        />
                                    </div>
                                </div>

                                {/* ELD Log Sheets */}
                                <div className="eld-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                    <div className="eld-section-header">
                                        <h2>📋 Daily Log Sheets</h2>
                                        <div className="eld-day-nav">
                                            {tripData.trip.daily_logs.map((log, i) => (
                                                <button
                                                    key={i}
                                                    className={`eld-day-btn ${activeDay === i ? 'active' : ''}`}
                                                    onClick={() => setActiveDay(i)}
                                                >
                                                    Day {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {tripData.trip.daily_logs[activeDay] && (
                                        <ELDLogSheet
                                            key={activeDay}
                                            log={tripData.trip.daily_logs[activeDay]}
                                            dayNumber={activeDay + 1}
                                            stops={tripData.trip.stops}
                                            onPrevDay={() => setActiveDay(prev => Math.max(0, prev - 1))}
                                            onNextDay={() => setActiveDay(prev => Math.min(tripData.trip.daily_logs.length - 1, prev + 1))}
                                            hasPrev={activeDay > 0}
                                            hasNext={activeDay < tripData.trip.daily_logs.length - 1}
                                        />
                                    )}
                                </div>
                            </>
                        )}

                        {tripData && (
                            <div className="review-form-wrapper animate-fade-in-up log-details-section" style={{ animationDelay: '0.25s' }} ref={logDetailsRef}>
                                <LogDetailsForm metadata={logMetadata} setMetadata={setLogMetadata} />
                            </div>
                        )}

                        {tripData && (
                            <div className="pdf-download-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className="pdf-download-card">
                                    <div className="pdf-icon">📄</div>
                                    <div className="pdf-info">
                                        <h3>Download Trip Plan & Logs</h3>
                                        <p>Get a complete PDF of your trip summary and all daily ELD logs.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowDownloadConfirm(true)}
                                        disabled={isGeneratingPdf}
                                        className="pdf-download-btn"
                                        style={{ cursor: isGeneratingPdf ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isGeneratingPdf ? '⏳ Generating PDF...' : '⬇️ Download PDF'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Hidden elements for PDF export - ensuring they are laid out correctly for capture */}
                        {tripData && (
                            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', opacity: 0 }} data-theme="light">
                                <div id="pdf-summary-export" style={{ padding: '40px', background: '#ffffff', width: '850px', borderRadius: '12px', marginBottom: '50px' }}>
                                    <h1 style={{ color: '#1a1f35', marginBottom: '20px', fontSize: '28px', fontFamily: 'Inter, sans-serif', borderBottom: '2px solid #3b82f6', paddingBottom: '10px' }}>Spotter AI — Trip Plan & Summary</h1>
                                    <TripSummary summary={tripData.trip.summary} />
                                    <div style={{ marginTop: '30px', color: '#64748b', fontSize: '14px' }}>
                                        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                                    </div>
                                </div>

                                {tripData.trip.daily_logs.map((log, i) => (
                                    <div id={`pdf-log-export-${i}`} key={i} style={{ padding: '20px', paddingBottom: '100px', background: '#ffffff', width: '1050px', marginBottom: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <PaperLogSheet
                                            log={log}
                                            dayNumber={i + 1}
                                            stops={tripData.trip.stops}
                                            tripInfo={{
                                                from: tripData.locations.pickup?.display_name || '',
                                                to: tripData.locations.dropoff?.display_name || '',
                                                carrierName: logMetadata.carrierName,
                                                homeTerminal: logMetadata.homeTerminal,
                                                truck_info: logMetadata.truckNumber,
                                                shipper: logMetadata.shipper,
                                                commodity: logMetadata.commodity,
                                                loadNumber: logMetadata.loadNumber
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>

                {/* Mobile Bottom Navigation */}
                <nav className="bottom-nav">
                    <button
                        className={`nav-item ${activeMobileTab === 'plan' ? 'active' : ''}`}
                        onClick={() => setActiveMobileTab('plan')}
                    >
                        <ClipboardList size={22} />
                        <span>Plan</span>
                    </button>
                    {tripData && (
                        <>
                            <button
                                className={`nav-item ${activeMobileTab === 'route' ? 'active' : ''}`}
                                onClick={() => setActiveMobileTab('route')}
                            >
                                <MapIcon size={22} />
                                <span>Route</span>
                            </button>
                            <button
                                className={`nav-item ${activeMobileTab === 'logs' ? 'active' : ''}`}
                                onClick={() => setActiveMobileTab('logs')}
                            >
                                <FileCheck size={22} />
                                <span>Logs</span>
                            </button>
                        </>
                    )}
                </nav>
            </div>

            {/* Download Confirmation Modal */}
            {showDownloadConfirm && (
                <div className="review-modal-overlay" onClick={() => {
                    setShowDownloadConfirm(false)
                    if (logDetailsRef.current) {
                        logDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }}>
                    <div className="review-modal-content animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <div className="review-modal-header">
                            <h3>📄 Review Log Details</h3>
                        </div>
                        <div className="review-modal-body">
                            <p>Have you filled in the correct <strong>Carrier Name</strong>, <strong>Trailer Number</strong>, and <strong>Load Details</strong>?</p>
                            <p className="review-modal-hint" style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>These details will be printed on your official FMCSA log sheets.</p>
                        </div>
                        <div className="review-modal-actions">
                            <button className="review-btn-secondary" onClick={() => {
                                setShowDownloadConfirm(false)
                                if (logDetailsRef.current) {
                                    logDetailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                            }}>
                                ✏️ Review Form
                            </button>
                            <button className="review-btn-primary" onClick={() => {
                                setShowDownloadConfirm(false)
                                handleDownloadPdf()
                            }}>
                                ⬇️ Download Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default App

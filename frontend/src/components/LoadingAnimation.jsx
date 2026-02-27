import React, { useEffect, useState } from 'react';
import './LoadingAnimation.css';
import optimusTruck from '../assets/optimus_truck.png';

const FrontTruckSVG = () => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.3))' }}>
        {/* Glow/Shadow behind */}
        <ellipse cx="50" cy="92" rx="42" ry="8" fill="rgba(0,0,0,0.8)" filter="blur(4px)" />

        {/* --- Background/Base Chassis --- */}
        <rect x="25" y="15" width="50" height="70" rx="4" fill="#0f172a" />

        {/* --- Smokestacks (Exhausts) --- */}
        {/* Left Stack */}
        <rect x="12" y="18" width="6" height="42" fill="#cbd5e1" />
        <rect x="14" y="22" width="2" height="38" fill="#f8fafc" />
        <polygon points="12,18 18,18 16,10 12,14" fill="#94a3b8" />
        <rect x="10" y="35" width="10" height="3" fill="#475569" />
        <rect x="10" y="45" width="10" height="3" fill="#475569" />

        {/* Right Stack */}
        <rect x="82" y="18" width="6" height="42" fill="#cbd5e1" />
        <rect x="84" y="22" width="2" height="38" fill="#f8fafc" />
        <polygon points="82,18 88,18 88,14 84,10" fill="#94a3b8" />
        <rect x="80" y="35" width="10" height="3" fill="#475569" />
        <rect x="80" y="45" width="10" height="3" fill="#475569" />

        {/* --- Main Cab Upper (Red/Blue Armor) --- */}
        {/* Top fairing */}
        <polygon points="30,10 70,10 75,25 25,25" fill="#dc2626" />
        <polygon points="35,10 65,10 50,18" fill="#991b1b" /> {/* center detail */}

        {/* Side pillars */}
        <polygon points="20,25 28,25 28,52 20,52" fill="#dc2626" />
        <polygon points="72,25 80,25 80,52 72,52" fill="#dc2626" />

        {/* Windshield - Aggressive V-shape split */}
        <polygon points="28,25 48,25 48,46 28,42" fill="#38bdf8" />
        <polygon points="52,25 72,25 72,42 52,46" fill="#38bdf8" />

        {/* Windshield glare */}
        <polygon points="30,27 45,27 45,35 30,38" fill="rgba(255,255,255,0.3)" />
        <polygon points="55,27 70,27 70,38 55,35" fill="rgba(255,255,255,0.3)" />

        {/* Center Metal Spine between windows */}
        <rect x="48" y="24" width="4" height="23" fill="#94a3b8" />

        {/* --- Main Cab Lower (Blue Armor) --- */}
        <polygon points="20,52 80,52 85,72 15,72" fill="#1d4ed8" />
        {/* Lower side cheeks */}
        <polygon points="15,72 30,72 30,80 18,80" fill="#1e3a8a" />
        <polygon points="70,72 85,72 82,80 70,80" fill="#1e3a8a" />

        {/* --- Front Grill (Huge & Chrome) --- */}
        <rect x="30" y="48" width="40" height="28" rx="2" fill="#cbd5e1" />
        <rect x="32" y="50" width="36" height="24" fill="#0f172a" />
        {/* Grill Slats */}
        <rect x="34" y="50" width="4" height="24" fill="#94a3b8" />
        <rect x="42" y="50" width="4" height="24" fill="#94a3b8" />
        <rect x="50" y="50" width="4" height="24" fill="#94a3b8" />
        <rect x="58" y="50" width="4" height="24" fill="#94a3b8" />
        <rect x="66" y="50" width="4" height="24" fill="#94a3b8" />

        {/* --- Autobot-style Center Badge --- */}
        <polygon points="50,44 54,48 50,52 46,48" fill="#fef08a" />
        <polygon points="50,46 52,48 50,50 48,48" fill="#f59e0b" />

        {/* --- Bumper --- */}
        <polygon points="20,76 80,76 85,86 15,86" fill="#64748b" />
        <rect x="30" y="80" width="40" height="4" fill="#334155" />

        {/* --- Headlights (Fierce Angled Quad-lights) --- */}
        <polygon points="22,66 28,64 28,70 24,70" fill="#fef08a" filter="drop-shadow(0 0 4px #eab308)" />
        <polygon points="16,68 20,66 22,70 18,72" fill="#fef08a" filter="drop-shadow(0 0 4px #eab308)" />
        <polygon points="72,64 78,66 76,70 72,70" fill="#fef08a" filter="drop-shadow(0 0 4px #eab308)" />
        <polygon points="80,66 84,68 82,72 78,70" fill="#fef08a" filter="drop-shadow(0 0 4px #eab308)" />

        {/* --- Wheels (Wide & Aggressive) --- */}
        <rect x="5" y="70" width="16" height="25" rx="3" fill="#020617" />
        <rect x="7" y="72" width="4" height="21" fill="#1e293b" /> {/* tread indent */}

        <rect x="79" y="70" width="16" height="25" rx="3" fill="#020617" />
        <rect x="89" y="72" width="4" height="21" fill="#1e293b" /> {/* tread indent */}

        {/* --- Mirrors (Blade style) --- */}
        <polygon points="12,38 20,40 20,45 8,46" fill="#334155" />
        <polygon points="88,38 80,40 80,45 92,46" fill="#334155" />
    </svg>
);

const SpeedLines = () => {
    // Generate 35 lines
    const lines = Array.from({ length: 35 }).map((_, i) => {
        // Distribute them evenly but with some randomness inside a circle
        const angle = Math.random() * Math.PI * 2;
        // avoid center so they don't hit the truck directly
        const radius = 20 + Math.random() * 80; // 20% to 100% from center
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;

        const delay = Math.random() * 2; // 0 to 2s
        const duration = 0.5 + Math.random() * 1.5; // 0.5s to 2.0s

        return {
            id: i,
            style: {
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `-${delay}s`,
                animationDuration: `${duration}s`
            }
        };
    });

    return (
        <div className="speed-lines-container">
            {lines.map(l => (
                <div key={l.id} className="speed-line" style={l.style}></div>
            ))}
        </div>
    );
};

const ShootingStars = () => {
    // Generate 20 shooting stars
    const stars = Array.from({ length: 20 }).map((_, i) => {
        // Distribute them widely
        const angle = Math.random() * Math.PI * 2;
        // Keep them far from the very center so they frame the truck
        const radius = 30 + Math.random() * 60; // 30% to 90% from center
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;

        const delay = Math.random() * 3; // 0 to 3s delay
        const duration = 0.8 + Math.random() * 1.5; // 0.8s to 2.3s duration (fast!)

        return {
            id: i,
            style: {
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `-${delay}s`,
                animationDuration: `${duration}s`
            }
        };
    });

    return (
        <div className="stars-container">
            {stars.map(s => (
                <div key={s.id} className="shooting-star" style={s.style} />
            ))}
        </div>
    );
};

const ParticleBurst = () => {
    // Generate 24 random particles
    const particles = Array.from({ length: 24 }).map((_, i) => {
        // Random angle 0 to 360
        const angle = Math.random() * Math.PI * 2;
        // Random distance 150px to 600px
        const distance = 150 + Math.random() * 450;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        const rot = Math.random() * 720 - 360; // -360 to +360 deg

        // Random colors
        const colors = ['#3b82f6', '#1e3a8a', '#60a5fa', '#fef08a', '#ffffff', '#94a3b8'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random sizes
        const size = 10 + Math.random() * 25;

        return {
            id: i,
            style: {
                '--tx': `${tx}px`,
                '--ty': `${ty}px`,
                '--rot': `${rot}deg`,
                backgroundColor: color,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px', // mix circles and shards
                clipPath: Math.random() > 0.7 ? 'polygon(50% 0%, 100% 100%, 0% 100%)' : 'none'
            }
        };
    });

    return (
        <div className="burst-container">
            <div className="burst-shockwave"></div>
            {particles.map(p => (
                <div key={p.id} className="burst-particle" style={p.style}></div>
            ))}
        </div>
    );
};

const LoadingAnimation = ({ isVisible, isBursting }) => {
    const [renderParams, setRenderParams] = useState({ show: false, fadingOut: false });

    // Handle mount/unmount animations
    useEffect(() => {
        if (isVisible) {
            setRenderParams({ show: true, fadingOut: false });
        } else if (!isVisible && renderParams.show) {
            setRenderParams(prev => ({ ...prev, fadingOut: true }));
            const timer = setTimeout(() => {
                setRenderParams({ show: false, fadingOut: false });
            }, 500); // match transition duration
            return () => clearTimeout(timer);
        }
    }, [isVisible, renderParams.show]);

    if (!renderParams.show) return null;

    return (
        <div className={`loading-overlay ${renderParams.fadingOut ? 'fade-out' : ''}`}>

            <div className={`truck-perspective-container ${isBursting ? 'burst-active' : ''}`}>
                <div className="truck-rumble">
                    <img src={optimusTruck} alt="Truck" className="real-truck" />
                </div>
                {isBursting && <ParticleBurst />}
            </div>

            {!isBursting && (
                <>
                    <SpeedLines />
                    <ShootingStars />
                </>
            )}

            {!isBursting && (
                <div style={{ position: 'absolute', bottom: '20%', color: 'white', fontSize: '1.2rem', fontWeight: 500, letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>
                    CALCULATING ROUTE & LOGS...
                </div>
            )}
        </div>
    );
};

export default LoadingAnimation;

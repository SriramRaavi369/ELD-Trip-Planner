import { useEffect, useRef } from 'react'
import L from 'leaflet'

// Fix default marker icons for leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const STOP_ICONS = {
    start: { emoji: '📍', color: '#3b82f6' },
    pickup: { emoji: '📦', color: '#22c55e' },
    dropoff: { emoji: '🏁', color: '#ef4444' },
    fuel: { emoji: '⛽', color: '#f59e0b' },
    rest: { emoji: '🛏️', color: '#8b5cf6' },
    break: { emoji: '☕', color: '#06b6d4' },
}

function createStopIcon(type) {
    const config = STOP_ICONS[type] || STOP_ICONS.start
    return L.divIcon({
        className: 'custom-stop-icon',
        html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${config.color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${config.emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20],
    })
}

function RouteMap({ route, stops, locations }) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)

    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
        }

        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
        })

        mapInstanceRef.current = map

        // Light-themed map tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
            maxZoom: 19,
            minZoom: 4, // Prevent zooming out so far that the map repeats
            noWrap: true
        }).addTo(map)

        // Draw route polyline
        if (route?.geometry?.length > 0) {
            const latLngs = route.geometry.map(coord => [coord[1], coord[0]])
            const routeLine = L.polyline(latLngs, {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1,
            }).addTo(map)

            // Add a glow effect
            L.polyline(latLngs, {
                color: '#3b82f6',
                weight: 10,
                opacity: 0.15,
                smoothFactor: 1,
            }).addTo(map)

            map.fitBounds(routeLine.getBounds(), { padding: [40, 40] })
        }

        // Add stop markers
        if (stops?.length > 0) {
            stops.forEach((stop) => {
                if (stop.coordinates) {
                    const { lat, lng } = stop.coordinates
                    const icon = createStopIcon(stop.type)
                    const marker = L.marker([lat, lng], { icon }).addTo(map)

                    const arrivalTime = stop.arrival_time
                        ? new Date(stop.arrival_time).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                            hour12: true,
                        })
                        : ''

                    marker.bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 180px;">
              <strong style="font-size: 14px;">${stop.location_name}</strong><br/>
              <span style="color: #666; font-size: 12px;">
                ${arrivalTime}<br/>
                ${stop.duration_hours > 0 ? `Duration: ${stop.duration_hours}h` : ''}<br/>
                Mile: ${stop.cumulative_miles}
              </span>
            </div>
          `)
                }
            })
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [route, stops, locations])

    return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
}

export default RouteMap

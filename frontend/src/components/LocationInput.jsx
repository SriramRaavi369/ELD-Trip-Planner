import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

function LocationInput({ id, name, value, onChange, placeholder, required }) {
    const [suggestions, setSuggestions] = useState([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [loading, setLoading] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const wrapperRef = useRef(null)
    const debounceRef = useRef(null)

    // Fetch suggestions from backend
    const fetchSuggestions = async (query) => {
        if (query.length < 2) {
            setSuggestions([])
            setShowDropdown(false)
            return
        }

        setLoading(true)
        try {
            const resp = await axios.get('/api/autocomplete/', { params: { q: query } })
            setSuggestions(resp.data || [])
            setShowDropdown(true)
            setHighlightIndex(-1)
        } catch {
            setSuggestions([])
        } finally {
            setLoading(false)
        }
    }

    // Debounced input handler
    const handleInputChange = (e) => {
        const newValue = e.target.value
        // Pass a synthetic-like event to parent
        onChange({ target: { name, value: newValue } })

        // Debounce the API call
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue)
        }, 300)
    }

    // Select a suggestion
    const handleSelect = (suggestion) => {
        // Shorten the display name (take first 2-3 parts)
        const parts = suggestion.display_name.split(', ')
        const shortName = parts.length > 2 ? parts.slice(0, 3).join(', ') : suggestion.display_name
        onChange({ target: { name, value: shortName } })
        setSuggestions([])
        setShowDropdown(false)
        setHighlightIndex(-1)
    }

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!showDropdown || suggestions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault()
            handleSelect(suggestions[highlightIndex])
        } else if (e.key === 'Escape') {
            setShowDropdown(false)
            setHighlightIndex(-1)
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false)
                setHighlightIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    // Format display name for dropdown
    const formatName = (displayName) => {
        const parts = displayName.split(', ')
        if (parts.length <= 2) return { primary: displayName, secondary: '' }
        return {
            primary: parts.slice(0, 2).join(', '),
            secondary: parts.slice(2).join(', '),
        }
    }

    return (
        <div className="location-input-wrapper" ref={wrapperRef}>
            <input
                id={id}
                name={name}
                type="text"
                className="form-input"
                placeholder={placeholder}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
                required={required}
                autoComplete="off"
            />
            {loading && <div className="autocomplete-loading">⟳</div>}

            {showDropdown && suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                    {suggestions.map((s, i) => {
                        const { primary, secondary } = formatName(s.display_name)
                        return (
                            <div
                                key={i}
                                className={`autocomplete-item ${i === highlightIndex ? 'highlighted' : ''}`}
                                onMouseDown={() => handleSelect(s)}
                                onMouseEnter={() => setHighlightIndex(i)}
                            >
                                <span className="autocomplete-pin">📍</span>
                                <div className="autocomplete-text">
                                    <div className="autocomplete-primary">{primary}</div>
                                    {secondary && (
                                        <div className="autocomplete-secondary">{secondary}</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showDropdown && !loading && suggestions.length === 0 && value.length >= 2 && (
                <div className="autocomplete-dropdown">
                    <div className="autocomplete-empty">No locations found</div>
                </div>
            )}
        </div>
    )
}

export default LocationInput

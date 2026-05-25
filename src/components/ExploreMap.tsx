'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { Vibe } from '@/types'

// Fix Leaflet's default icon paths in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Utility component to handle "Center on me" programmatically
function ChangeView({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom)
  }, [center, zoom, map])
  return null
}

interface ExploreMapProps {
  vibes: Vibe[]
  center: { lat: number; lng: number }
  zoom: number
  selectedVibe: Vibe | null
  onMarkerClick: (vibe: Vibe) => void
  onMapClick?: () => void
}

export default function ExploreMap({ vibes, center, zoom, selectedVibe, onMarkerClick, onMapClick }: ExploreMapProps) {
  // Setup custom divIcon logic
  const createCustomIcon = (vibe: Vibe, isSelected: boolean) => {
    const isLive = new Date(vibe.expires_at) > new Date()
    let pinColor = '#E85A4F' // Red
    if (vibe.type === 'plan') pinColor = '#EFB11D' // Orange
    if (vibe.type === 'collab') pinColor = '#4285F4' // Blue

    const size = isSelected ? 48 : 36
    const avatarUrl = vibe.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(vibe.user?.full_name || 'User')}&background=F4F4F4&color=333`

    const htmlString = `
      <div style="
        width: ${size}px; height: ${size}px; 
        background: #FFF; border-radius: 50%; 
        border: 3px solid ${pinColor}; 
        box-shadow: 0 ${isSelected ? 8 : 4}px ${isSelected ? 24 : 12}px rgba(0,0,0,0.2); 
        position: relative; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden;
      ">
        <img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
        ${isLive && vibe.type === 'live' ? `<div style="position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; background: ${pinColor}; border: 2px solid #FFF;"></div>` : ''}
      </div>
    `

    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: htmlString,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} onClick={onMapClick}>
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        zoomControl={false} // Disable default zoom controls for minimal UI
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeView center={center} zoom={zoom} />
        
        {/* Carto Voyager tiles - modern, minimal, premium */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* User Location Marker (Simple blue dot) */}
        <Marker 
          position={[center.lat, center.lng]}
          icon={L.divIcon({
            className: 'user-location-marker',
            html: `<div style="width: 18px; height: 18px; background: #4285F4; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          })}
        />

        {/* Vibe Markers */}
        {vibes.map(vibe => {
          const hash = vibe.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          const jitterLat = (hash % 100) / 10000
          const jitterLng = ((hash * 2) % 100) / 10000
          const pos: [number, number] = [(vibe.lat || 19.0760) + jitterLat, (vibe.lng || 72.8777) + jitterLng]
          
          return (
            <Marker 
              key={vibe.id}
              position={pos}
              icon={createCustomIcon(vibe, selectedVibe?.id === vibe.id)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e) // Prevent map click
                  onMarkerClick(vibe)
                }
              }}
            />
          )
        })}
      </MapContainer>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container {
          background: #E8E6E1; /* Nice warm map background color */
          font-family: inherit;
        }
        .custom-leaflet-icon {
          background: none;
          border: none;
        }
        .user-location-marker {
          background: none;
          border: none;
        }
        /* Hide attribution for a completely clean UI if needed, though OSM requires it. We keep it minimal. */
        .leaflet-control-attribution {
          opacity: 0.5;
          font-size: 9px;
        }
      `}} />
    </div>
  )
}

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OnlyPlans',
    short_name: 'OnlyPlans',
    description: 'Find spontaneous plans happening around you right now.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF7F2',
    theme_color: '#FFF7F2',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}

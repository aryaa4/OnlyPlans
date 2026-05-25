import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'OnlyPlans – Real-world meetup app',
  description: 'Create instant plans, join live events, and meet people in real life. OnlyPlans connects you with nearby people ready to hang out, collaborate, and explore.',
  keywords: 'meetup, plans, social, real-world, events, local, community',
  openGraph: {
    title: 'OnlyPlans',
    description: 'Create instant plans. Meet real people.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFF7F2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful');
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          containerStyle={{ pointerEvents: 'none' }}
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1A1A26',
              color: '#fff',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '14px',
              fontWeight: '500',
              pointerEvents: 'auto',
            },
          }}
        />
      </body>
    </html>
  )
}

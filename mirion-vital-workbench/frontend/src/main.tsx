import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import AppWithSidebar from './AppWithSidebar'
import { ToastProvider } from './components/Toast'
import './index.css'

/**
 * Layout Feature Flag
 *
 * APX-style sidebar layout is now the default.
 * Set to false to use the original horizontal breadcrumb layout.
 *
 * Toggle via localStorage: localStorage.setItem('USE_SIDEBAR_LAYOUT', 'false')
 */
const USE_SIDEBAR_LAYOUT = localStorage.getItem('USE_SIDEBAR_LAYOUT') !== 'false'

const AppComponent = USE_SIDEBAR_LAYOUT ? AppWithSidebar : App

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - data considered fresh
      gcTime: 1000 * 60 * 5, // 5 minutes - keep unused data in cache
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: true, // Refetch on component mount if stale
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AppComponent />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

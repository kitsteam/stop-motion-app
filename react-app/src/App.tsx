import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import './App.css'
import ToastProvider from './components/ToastProvider'
import AlertProvider from './components/AlertProvider'
import LoadingOverlay from './components/LoadingOverlay'

export default function App() {
  return (
    <ToastProvider>
      <AlertProvider>
        <main>
          <Suspense fallback={<LoadingOverlay visible={true} />}>
            <Outlet />
          </Suspense>
        </main>
      </AlertProvider>
    </ToastProvider>
  )
}

import { Outlet } from 'react-router-dom'
import './App.css'
import ToastProvider from './components/ToastProvider'
import AlertProvider from './components/AlertProvider'

export default function App() {
  return (
    <ToastProvider>
      <AlertProvider>
        <main>
          <Outlet />
        </main>
      </AlertProvider>
    </ToastProvider>
  )
}

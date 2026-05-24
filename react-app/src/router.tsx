import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import HomePage from './pages/HomePage'
import AnimatorPage from './pages/AnimatorPage'
import SettingsPage from './pages/SettingsPage'

export const routes = [
  {
    path: '/',
    Component: App,
    children: [
      { index: true, Component: HomePage },
      { path: 'animator', Component: AnimatorPage },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]

export const router = createBrowserRouter(routes)

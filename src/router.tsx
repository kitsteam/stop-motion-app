import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'

export const routes = [
  {
    path: '/',
    Component: App,
    children: [
      { index: true, Component: HomePage },
      {
        // Lazy-loaded so the media stack stays out of the initial bundle for
        // users who only visit '/' or '/settings'.
        path: 'animator',
        lazy: async () => {
          const { default: Component } = await import('./pages/AnimatorPage')
          return { Component }
        },
      },
      { path: 'settings', Component: SettingsPage },
    ],
  },
]

export const router = createBrowserRouter(routes)

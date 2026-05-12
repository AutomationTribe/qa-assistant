import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import TemplatePage from './pages/TemplatePage'
import FeaturesPage from './pages/FeaturesPage'
import TestCasesPage from './pages/TestCasesPage'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ui/ToastContainer'
import { useAuthStore } from './store/authStore'
import { authAPI } from './api/auth'

export default function App() {
  const { setAuth, clearAuth } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const recoverSession = async () => {
      try {
        const { accessToken, user } = await authAPI.refresh()
        setAuth(user, accessToken)
      } catch {
        clearAuth()
      } finally {
        setChecking(false)
      }
    }

    recoverSession()
  }, [])

  if (checking) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#F0F0ED',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#999',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/template"
          element={
            <ProtectedRoute>
              <TemplatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/features"
          element={
            <ProtectedRoute>
              <FeaturesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/features/:featureId/testcases"
          element={
            <ProtectedRoute>
              <TestCasesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

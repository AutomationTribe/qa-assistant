import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import TemplatePage from './pages/TemplatePage';
import FeaturesPage from './pages/FeaturesPage';
import TestCasesPage from './pages/TestCasesPage';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ui/ToastContainer';
import { useAuthStore } from './store/authStore';
import { authAPI } from './api/auth';
export default function App() {
    const { setAuth, clearAuth } = useAuthStore();
    const [checking, setChecking] = useState(true);
    useEffect(() => {
        const recoverSession = async () => {
            const hadSession = localStorage.getItem('regi_had_session');
            if (!hadSession) {
                setChecking(false);
                return;
            }
            try {
                const { accessToken, user } = await authAPI.refresh();
                setAuth(user, accessToken);
            }
            catch {
                clearAuth();
                localStorage.removeItem('regi_had_session');
            }
            finally {
                setChecking(false);
            }
        };
        recoverSession();
    }, []);
    if (checking) {
        return (_jsx("div", { style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: '#F0F0ED',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '13px',
                color: '#999',
            }, children: "Loading..." }));
    }
    return (_jsxs(BrowserRouter, { future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        }, children: [_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/projects", element: _jsx(ProtectedRoute, { children: _jsx(ProjectsPage, {}) }) }), _jsx(Route, { path: "/projects/:projectId/template", element: _jsx(ProtectedRoute, { children: _jsx(TemplatePage, {}) }) }), _jsx(Route, { path: "/projects/:projectId/features", element: _jsx(ProtectedRoute, { children: _jsx(FeaturesPage, {}) }) }), _jsx(Route, { path: "/projects/:projectId/features/:featureId/testcases", element: _jsx(ProtectedRoute, { children: _jsx(TestCasesPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }), _jsx(ToastContainer, {})] }));
}

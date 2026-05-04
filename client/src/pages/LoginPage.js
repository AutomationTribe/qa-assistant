import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
const loginSchema = z.object({
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required'),
});
const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
});
export default function LoginPage() {
    const navigate = useNavigate();
    const { isAuthenticated, setAuth } = useAuthStore();
    const [activeTab, setActiveTab] = useState('signin');
    const loginForm = useForm({
        resolver: zodResolver(loginSchema),
        mode: 'onBlur',
    });
    const registerForm = useForm({
        resolver: zodResolver(registerSchema),
        mode: 'onBlur',
    });
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/projects', { replace: true });
        }
    }, [isAuthenticated, navigate]);
    const onLoginSubmit = async (data) => {
        try {
            const response = await apiClient.post('/v1/auth/login', data);
            const { accessToken, user } = response.data;
            setAuth(user, accessToken);
            navigate('/projects', { replace: true });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
            loginForm.setError('email', { message });
        }
    };
    const onRegisterSubmit = async (data) => {
        try {
            await apiClient.post('/v1/auth/register', {
                name: data.name,
                email: data.email,
                password: data.password,
                workspaceName: data.workspaceName,
            });
            const loginResponse = await apiClient.post('/v1/auth/login', {
                email: data.email,
                password: data.password,
            });
            const { accessToken, user } = loginResponse.data;
            setAuth(user, accessToken);
            navigate('/projects', { replace: true });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
            registerForm.setError('email', { message });
        }
    };
    return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-gray-100", children: _jsxs("div", { className: "w-full max-w-md bg-white rounded-lg shadow-md p-8", children: [_jsx("h1", { className: "text-2xl font-bold text-center mb-6", children: "Regi" }), _jsxs("div", { className: "flex gap-4 border-b border-gray-200 mb-6", children: [_jsx("button", { onClick: () => setActiveTab('signin'), className: `pb-2 px-2 font-medium transition ${activeTab === 'signin'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'}`, children: "Sign In" }), _jsx("button", { onClick: () => setActiveTab('signup'), className: `pb-2 px-2 font-medium transition ${activeTab === 'signup'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'}`, children: "Create Account" })] }), activeTab === 'signin' && (_jsxs("form", { onSubmit: loginForm.handleSubmit(onLoginSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", ...loginForm.register('email'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), loginForm.formState.errors.email && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: loginForm.formState.errors.email.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Password" }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...loginForm.register('password'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), loginForm.formState.errors.password && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: loginForm.formState.errors.password.message }))] }), _jsx("button", { type: "submit", disabled: loginForm.formState.isSubmitting, className: "w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50", children: loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign In' })] })), activeTab === 'signup' && (_jsxs("form", { onSubmit: registerForm.handleSubmit(onRegisterSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Full Name" }), _jsx("input", { type: "text", placeholder: "Your full name", ...registerForm.register('name'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), registerForm.formState.errors.name && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: registerForm.formState.errors.name.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Email" }), _jsx("input", { type: "email", placeholder: "you@example.com", ...registerForm.register('email'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), registerForm.formState.errors.email && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: registerForm.formState.errors.email.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Password" }), _jsx("input", { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...registerForm.register('password'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), registerForm.formState.errors.password && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: registerForm.formState.errors.password.message })), !registerForm.formState.errors.password && (_jsx("p", { className: "text-gray-500 text-xs mt-1", children: "Use at least 8 characters" }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Workspace Name" }), _jsx("input", { type: "text", placeholder: "Your company or team name", ...registerForm.register('workspaceName'), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" }), registerForm.formState.errors.workspaceName && (_jsx("p", { className: "text-red-600 text-sm mt-1", children: registerForm.formState.errors.workspaceName.message })), _jsx("p", { className: "text-gray-500 text-xs mt-1", children: "This is your team's workspace in Regi" })] }), _jsx("button", { type: "submit", disabled: registerForm.formState.isSubmitting, className: "w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50", children: registerForm.formState.isSubmitting ? 'Creating account...' : 'Create Account' })] }))] }) }));
}

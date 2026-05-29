import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
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
    const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
    const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
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
        if (isSubmittingLogin)
            return;
        setIsSubmittingLogin(true);
        try {
            const { accessToken, user } = await authAPI.login(data.email, data.password);
            setAuth(user, accessToken);
            sessionStorage.setItem('regi_session', 'true');
            navigate('/projects', { replace: true });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed. Please check your credentials.';
            loginForm.setError('email', { message });
        }
        finally {
            setIsSubmittingLogin(false);
        }
    };
    const onRegisterSubmit = async (data) => {
        if (isSubmittingRegister)
            return;
        setIsSubmittingRegister(true);
        try {
            await authAPI.register(data.email, data.name, data.password, data.workspaceName);
            const { accessToken, user } = await authAPI.login(data.email, data.password);
            setAuth(user, accessToken);
            sessionStorage.setItem('regi_session', 'true');
            navigate('/projects', { replace: true });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
            registerForm.setError('email', { message });
        }
        finally {
            setIsSubmittingRegister(false);
        }
    };
    return (_jsxs("div", { className: "flex min-h-screen", children: [_jsxs("div", { className: "hidden lg:flex lg:w-[38%] bg-gradient-to-b from-[#18181B] to-[#312E81] flex-col justify-between p-12 text-white", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-12", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-lg", children: "R" }), _jsx("span", { className: "text-2xl font-bold", children: "Regi" })] }), _jsx("p", { className: "text-lg leading-relaxed opacity-90 max-w-md", children: "Generate QA test cases from your tickets using AI." })] }), _jsxs("div", { className: "border-l-2 border-[#4F46E5] pl-4", children: [_jsx("p", { className: "italic mb-4 text-base leading-relaxed opacity-90", children: "\"Testing is the most important part of software development. Regi makes it painless.\"" }), _jsx("p", { className: "text-sm opacity-70", children: "\u2014 QA Lead, TechCorp" })] })] }), _jsx("div", { className: "flex-1 bg-white flex items-center justify-center p-6", children: _jsxs("div", { className: "w-full max-w-[320px]", children: [_jsx("h1", { className: "text-[22px] font-semibold text-[#111] mb-2", children: "Welcome back" }), _jsx("p", { className: "text-[13px] text-[#999] mb-6", children: "Sign in to your Regi workspace" }), _jsxs("div", { className: "flex gap-6 border-b border-[#EBEBEB] mb-6", children: [_jsx("button", { onClick: () => setActiveTab('signin'), className: `pb-2 text-sm font-medium transition ${activeTab === 'signin'
                                        ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                                        : 'border-b-2 border-transparent text-[#aaa] hover:text-[#666]'}`, children: "Sign In" }), _jsx("button", { onClick: () => setActiveTab('signup'), className: `pb-2 text-sm font-medium transition ${activeTab === 'signup'
                                        ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                                        : 'border-b-2 border-transparent text-[#aaa] hover:text-[#666]'}`, children: "Create Account" })] }), activeTab === 'signin' && (_jsxs("form", { onSubmit: loginForm.handleSubmit(onLoginSubmit), children: [_jsxs("div", { className: "flex flex-col gap-4 mb-4", children: [_jsx(Input, { type: "email", label: "Email address", placeholder: "you@example.com", ...loginForm.register('email'), error: loginForm.formState.errors.email?.message }), _jsx(Input, { type: "password", label: "Password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...loginForm.register('password'), error: loginForm.formState.errors.password?.message })] }), _jsx(Button, { fullWidth: true, loading: loginForm.formState.isSubmitting, children: "Sign in \u2192" }), _jsxs("p", { className: "text-center text-[12px] text-[#999] mt-4", children: ["Forgot password?", ' ', _jsx("a", { href: "#", className: "text-[#4F46E5] hover:underline", children: "Reset it" })] })] })), activeTab === 'signup' && (_jsxs("form", { onSubmit: registerForm.handleSubmit(onRegisterSubmit), children: [_jsxs("div", { className: "flex flex-col gap-4 mb-4", children: [_jsx(Input, { type: "text", label: "Full name", placeholder: "Your name", ...registerForm.register('name'), error: registerForm.formState.errors.name?.message }), _jsx(Input, { type: "email", label: "Work email", placeholder: "you@company.com", ...registerForm.register('email'), error: registerForm.formState.errors.email?.message }), _jsx(Input, { type: "password", label: "Password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", hint: "Use at least 8 characters", ...registerForm.register('password'), error: registerForm.formState.errors.password?.message }), _jsx(Input, { type: "text", label: "Workspace name", placeholder: "Your team's workspace", hint: "Your team's shared workspace in Regi", ...registerForm.register('workspaceName'), error: registerForm.formState.errors.workspaceName?.message })] }), _jsx(Button, { fullWidth: true, loading: registerForm.formState.isSubmitting, children: "Create account \u2192" })] }))] }) })] }));
}

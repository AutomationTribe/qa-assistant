import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { authAPI } from '@/api/auth'
import Input from '@/components/ui/Input'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false)

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/projects', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const onLoginSubmit = async (data: LoginFormData) => {
    if (isSubmittingLogin) return
    setIsSubmittingLogin(true)
    try {
      const { accessToken, user } = await authAPI.login(data.email, data.password)
      setAuth(user, accessToken)
      sessionStorage.setItem('regi_session', 'true')
      navigate('/projects', { replace: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login failed. Please check your credentials.'
      loginForm.setError('email', { message })
    } finally {
      setIsSubmittingLogin(false)
    }
  }

  const onRegisterSubmit = async (data: RegisterFormData) => {
    if (isSubmittingRegister) return
    setIsSubmittingRegister(true)
    try {
      await authAPI.register(data.email, data.name, data.password, data.workspaceName)

      const { accessToken, user } = await authAPI.login(data.email, data.password)
      setAuth(user, accessToken)
      sessionStorage.setItem('regi_session', 'true')
      navigate('/projects', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      registerForm.setError('email', { message })
    } finally {
      setIsSubmittingRegister(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[38%] bg-gradient-to-b from-[#18181B] to-[#312E81] flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-[#4F46E5] flex items-center justify-center font-bold text-lg">
              R
            </div>
            <span className="text-2xl font-bold">Regi</span>
          </div>
          <p className="text-lg leading-relaxed opacity-90 max-w-md">
            Generate QA test cases from your tickets using AI.
          </p>
        </div>

        <div className="border-l-2 border-[#4F46E5] pl-4">
          <p className="italic mb-4 text-base leading-relaxed opacity-90">
            "Testing is the most important part of software development. Regi makes it painless."
          </p>
          <p className="text-sm opacity-70">— QA Lead, TechCorp</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-[320px]">
          <h1 className="text-[22px] font-semibold text-[#111] mb-2">Welcome back</h1>
          <p className="text-[13px] text-[#999] mb-6">Sign in to your Regi workspace</p>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-[#EBEBEB] mb-6">
            <button
              onClick={() => setActiveTab('signin')}
              className={`pb-2 text-sm font-medium transition ${
                activeTab === 'signin'
                  ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                  : 'border-b-2 border-transparent text-[#aaa] hover:text-[#666]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`pb-2 text-sm font-medium transition ${
                activeTab === 'signup'
                  ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                  : 'border-b-2 border-transparent text-[#aaa] hover:text-[#666]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <div className="flex flex-col gap-4 mb-4">
                <Input
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  {...loginForm.register('email')}
                  error={loginForm.formState.errors.email?.message}
                />
                <PasswordInput
                  label="Password"
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                />
              </div>
              <Button fullWidth loading={loginForm.formState.isSubmitting}>
                Sign in →
              </Button>
              <p className="text-center text-[12px] text-[#999] mt-4">
                Forgot password?{' '}
                <a href="#" className="text-[#4F46E5] hover:underline">
                  Reset it
                </a>
              </p>
            </form>
          )}

          {/* Create Account Form */}
          {activeTab === 'signup' && (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
              <div className="flex flex-col gap-4 mb-4">
                <Input
                  type="text"
                  label="Full name"
                  placeholder="Your name"
                  {...registerForm.register('name')}
                  error={registerForm.formState.errors.name?.message}
                />
                <Input
                  type="email"
                  label="Work email"
                  placeholder="you@company.com"
                  {...registerForm.register('email')}
                  error={registerForm.formState.errors.email?.message}
                />
                <PasswordInput
                  label="Password"
                  placeholder="••••••••"
                  hint="Use at least 8 characters"
                  {...registerForm.register('password')}
                  error={registerForm.formState.errors.password?.message}
                />
                <Input
                  type="text"
                  label="Workspace name"
                  placeholder="Your team's workspace"
                  hint="Your team's shared workspace in Regi"
                  {...registerForm.register('workspaceName')}
                  error={registerForm.formState.errors.workspaceName?.message}
                />
              </div>
              <Button fullWidth loading={registerForm.formState.isSubmitting}>
                Create account →
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

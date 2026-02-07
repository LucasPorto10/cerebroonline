import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/api/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/providers/auth-provider'

const authSchema = z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().optional(),
    fullName: z.string().optional(),
}).refine(() => {
    // Validation for confirmPassword is handled manually in onSubmit
    return true
})

// Refined types
type AuthForm = z.infer<typeof authSchema>

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const { user, loading: authLoading } = useAuth()

    // Using simple loading state for form submission, avoiding conflict with auth loading
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { register, handleSubmit, formState: { errors }, reset, setError } = useForm<AuthForm>({
        resolver: zodResolver(authSchema),
    })

    if (authLoading) return null // Or a spinner
    if (user) return <Navigate to="/dashboard" replace />

    const toggleMode = () => {
        setIsLogin(!isLogin)
        reset()
    }

    const onSubmit = async (data: AuthForm) => {
        if (!isLogin && data.password !== data.confirmPassword) {
            setError('confirmPassword', { type: 'manual', message: 'As senhas não coincidem' })
            return
        }

        setIsSubmitting(true)
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                })
                if (error) throw error
                // Auth provider will detect change and redirect
                toast.success('Login realizado com sucesso!')
            } else {
                const { error } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                    options: {
                        data: {
                            full_name: data.fullName || data.email.split('@')[0],
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${data.fullName || data.email}`,
                        },
                    },
                })
                if (error) throw error
                toast.success('Conta criada! Faça login para continuar.')
                setIsLogin(true) // Switch to login after signup
                reset()
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message === 'Invalid login credentials' ? 'Credenciais inválidas' : error.message || 'Erro na autenticação')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MindSync</h1>
                    <p className="text-slate-500 mt-2">
                        {isLogin ? 'Bem-vindo de volta ao seu segundo cérebro.' : 'Crie sua conta e organize sua mente.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <Input
                                placeholder="Nome Completo"
                                {...register('fullName')}
                                disabled={isSubmitting}
                            />
                            {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
                        </div>
                    )}

                    <div className="space-y-1">
                        <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...register('email')}
                            disabled={isSubmitting}
                        />
                        {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <Input
                            type="password"
                            placeholder="Senha"
                            {...register('password')}
                            disabled={isSubmitting}
                        />
                        {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                    </div>

                    {!isLogin && (
                        <div className="space-y-1">
                            <Input
                                type="password"
                                placeholder="Confirmar Senha"
                                {...register('confirmPassword')}
                                disabled={isSubmitting}
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                        </div>
                    )}

                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isSubmitting}>
                        {isSubmitting ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-sm text-slate-600 hover:text-slate-900 transition-colors underline underline-offset-4"
                    >
                        {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                    </button>
                </div>
            </div>
        </div>
    )
}

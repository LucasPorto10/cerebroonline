import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/api/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { User, Lock, Save } from 'lucide-react'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
})

const passwordSchema = z.object({
  password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function Settings() {
  const { user } = useAuth()
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      avatarUrl: user?.user_metadata?.avatar_url || '',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const onUpdateProfile = async (data: ProfileForm) => {
    setIsSubmittingProfile(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          avatar_url: data.avatarUrl,
        }
      })

      if (error) throw error
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar perfil')
    } finally {
      setIsSubmittingProfile(false)
    }
  }

  const onUpdatePassword = async (data: PasswordForm) => {
    setIsSubmittingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) throw error
      toast.success('Senha atualizada com sucesso!')
      resetPassword()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar senha')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h2>
        <p className="text-slate-500">Gerencie suas informações pessoais e segurança.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Perfil</h3>
              <p className="text-sm text-slate-500">Atualize suas informações públicas.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nome Completo
              </label>
              <Input
                {...registerProfile('fullName')}
                placeholder="Seu nome"
                disabled={isSubmittingProfile}
              />
              {profileErrors.fullName && (
                <p className="text-xs text-red-500 font-medium">{profileErrors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Avatar URL
              </label>
              <Input
                {...registerProfile('avatarUrl')}
                placeholder="https://exemplo.com/foto.jpg"
                disabled={isSubmittingProfile}
              />
               <p className="text-[0.8rem] text-slate-500">
                Use um link direto para uma imagem.
              </p>
              {profileErrors.avatarUrl && (
                <p className="text-xs text-red-500 font-medium">{profileErrors.avatarUrl.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmittingProfile} className="w-full mt-2">
              {isSubmittingProfile ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Password Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-amber-50 text-amber-600">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Segurança</h3>
              <p className="text-sm text-slate-500">Atualize sua senha de acesso.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitPassword(onUpdatePassword)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Nova Senha
              </label>
              <Input
                type="password"
                {...registerPassword('password')}
                placeholder="••••••"
                disabled={isSubmittingPassword}
              />
              {passwordErrors.password && (
                <p className="text-xs text-red-500 font-medium">{passwordErrors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Confirmar Senha
              </label>
              <Input
                type="password"
                {...registerPassword('confirmPassword')}
                placeholder="••••••"
                disabled={isSubmittingPassword}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-red-500 font-medium">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" variant="outline" disabled={isSubmittingPassword} className="w-full mt-2">
              {isSubmittingPassword ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

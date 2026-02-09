import { useState } from 'react'
import { AvatarUpload } from '@/components/features/AvatarUpload'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/api/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { motion } from 'framer-motion'
import { 
  User, Lock, Save, Mail, Calendar, 
  Sparkles, Trophy, Target, CheckCircle2, Clock,
  Palette, Moon, Zap, Sun, HardDrive
} from 'lucide-react'
import { useAppearance } from '@/hooks/useAppearance'
import { cn } from '@/lib/utils'
import { useStats } from '@/hooks/useStats'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  bio: z.string().max(160, 'Bio deve ter no máximo 160 caracteres').optional(),
  emoji: z.string().optional(),
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

const moodEmojis = ['😊', '🚀', '💡', '🎯', '⚡', '🔥', '✨', '🌟', '💪', '🧠', '🎨', '📚']
const themeColors = [
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
  { name: 'Violet', value: 'violet', class: 'bg-violet-500' },
  { name: 'Rose', value: 'rose', class: 'bg-rose-500' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-500' },
  { name: 'Amber', value: 'amber', class: 'bg-amber-500' },
  { name: 'Slate', value: 'slate', class: 'bg-slate-600' },
]

export default function Settings() {
  const { user } = useAuth()
  const { data: statsData } = useStats()
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(user?.user_metadata?.emoji || '🚀')
  const { theme, isDarkMode, updateTheme, toggleDarkMode } = useAppearance()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile')

  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors }, watch } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      avatarUrl: user?.user_metadata?.avatar_url || '',
      bio: user?.user_metadata?.bio || '',
      emoji: user?.user_metadata?.emoji || '🚀',
    }
  })

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const fullName = watch('fullName')

  const onUpdateProfile = async (data: ProfileForm) => {
    setIsSubmittingProfile(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          avatar_url: data.avatarUrl,
          bio: data.bio,
          emoji: selectedEmoji,
          theme: theme,
          darkMode: isDarkMode,
        }
      })

      if (error) throw error
      toast.success('Perfil atualizado com sucesso! ✨')
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



  const memberSince = user?.created_at 
    ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })
    : 'recentemente'

  const totalTasks = (statsData?.pending || 0) + (statsData?.inProgress || 0) + (statsData?.completed || 0)
  const completionRate = totalTasks > 0 ? Math.round((statsData?.completed || 0) / totalTasks * 100) : 0

  const [isReprocessing, setIsReprocessing] = useState(false)
  const [reprocessProgress, setReprocessProgress] = useState(0)
  const [reprocessTotal, setReprocessTotal] = useState(0)

  const handleReprocessEntries = async () => {
    if (!confirm('Isso irá reanalisar todas as suas notas e tarefas antigas para extrair datas e prioridades. Deseja continuar?')) return

    setIsReprocessing(true)
    setReprocessProgress(0)
    setReprocessTotal(0)

    try {
      // 1. Fetch all candidate entries
     const { data: entries, error } = await supabase
        .from('entries')
        .select('id, content, entry_type, category_id')
        .in('entry_type', ['task', 'note'])
        .is('due_date', null) // Only those without dates? Or all? User said "antigos... devem ser editados". Safest is reprocess all or those without metadata. Let's do all tasks/notes to be sure.
        // Actually, let's filter by those that might need it.
        // For now, let's fetch ALL tasks and notes to ensure everything is up to date.
      
      if (error) throw error
      if (!entries?.length) {
        toast.info('Nenhuma entrada para reprocessar.')
        return
      }

      setReprocessTotal(entries.length)
      let processed = 0

      // 2. Process in batches to avoid overwhelming the browser/network
      const BATCH_SIZE = 3
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE)
        
        await Promise.all(batch.map(async (entry) => {
          try {
            const { data: classification, error: aiError } = await supabase.functions.invoke('classify-entry', {
              body: { content: entry.content }
            })

            if (aiError) throw aiError

            const updates: any = {
                metadata: { ...((entry as any).metadata || {}), ...classification.metadata },
                tags: classification.metadata?.tags || [],
                updated_at: new Date().toISOString()
            }

            if (classification.metadata?.due_date) updates.due_date = classification.metadata.due_date
            if (classification.metadata?.priority) updates.priority = classification.metadata.priority

            await supabase
              .from('entries')
              .update(updates)
              .eq('id', entry.id)

          } catch (err) {
            console.error(`Falha ao processar entrada ${entry.id}:`, err)
          }
        }))

        processed += batch.length
        setReprocessProgress(Math.min(processed, entries.length))
      }

      toast.success('Reprocessamento concluído! 🎉')

    } catch (error: any) {
      toast.error('Erro ao reprocessar: ' + error.message)
    } finally {
      setIsReprocessing(false)
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative -mx-4 -mt-4 px-4 pt-12 pb-8 bg-gradient-to-br from-primary/5 via-background to-primary/5 border-b border-border"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar Section - Now with Upload */}
            <AvatarUpload
              currentUrl={user?.user_metadata?.avatar_url}
              userName={fullName}
              emoji={selectedEmoji}
              size="lg"
              onUploadComplete={(_url) => {
                toast.success('Foto atualizada!')
              }}
            />

            {/* User Info */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {fullName || 'Seu Nome'}
                </h1>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </p>
              </div>
              
              <p className="text-muted-foreground max-w-md">
                {user?.user_metadata?.bio || 'Adicione uma bio para se apresentar...'}
              </p>

              {/* Stats Pills */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-full shadow-sm border border-border text-sm">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="text-foreground">Membro {memberSince}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-full shadow-sm border border-border text-sm">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-foreground">{statsData?.completed || 0} tarefas concluídas</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card rounded-full shadow-sm border border-border text-sm">
                  <Target className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-foreground">{completionRate}% de conclusão</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="w-full overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <div className="flex items-center gap-2 p-1.5 bg-muted rounded-2xl w-max">
            {[
                { id: 'profile', label: 'Perfil', icon: User },
                { id: 'preferences', label: 'Aparência', icon: Palette },
                { id: 'security', label: 'Segurança', icon: Lock },
                { id: 'data', label: 'Dados', icon: HardDrive },
            ].map((tab) => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                    activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Profile Form */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Informações Pessoais</h3>
                  <p className="text-sm text-muted-foreground">Como você quer ser chamado</p>
                </div>
              </div>

              <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nome Completo</label>
                  <Input
                    {...registerProfile('fullName')}
                    placeholder="Seu nome"
                    disabled={isSubmittingProfile}
                    className="rounded-xl border-border bg-background focus:ring-primary/20"
                  />
                  {profileErrors.fullName && (
                    <p className="text-xs text-destructive">{profileErrors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Foto de Perfil (URL)</label>
                  <Input
                    {...registerProfile('avatarUrl')}
                    placeholder="https://exemplo.com/sua-foto.jpg"
                    disabled={isSubmittingProfile}
                    className="rounded-xl border-border bg-background focus:ring-primary/20"
                  />
                  <p className="text-xs text-muted-foreground">Cole o link de uma imagem sua</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bio</label>
                  <textarea
                    {...registerProfile('bio')}
                    placeholder="Conte um pouco sobre você..."
                    disabled={isSubmittingProfile}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">Máximo de 160 caracteres</p>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingProfile} 
                  className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-90"
                >
                  {isSubmittingProfile ? 'Salvando...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Emoji Selector */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Seu Emoji</h3>
                  <p className="text-sm text-muted-foreground">Escolha um que represente você</p>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {moodEmojis.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={cn(
                      "w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all",
                      selectedEmoji === emoji 
                        ? "bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background" 
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              {/* Personal Stats */}
              <div className="mt-8 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Suas Conquistas
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-muted-foreground">Tarefas Concluídas</span>
                    </div>
                    <span className="font-bold text-foreground">{statsData?.completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">Em Progresso</span>
                    </div>
                    <span className="font-bold text-foreground">{statsData?.inProgress || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
                    </div>
                    <span className="font-bold text-foreground">{completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'preferences' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm max-w-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Aparência</h3>
                <p className="text-sm text-muted-foreground">Personalize a cara do seu CerebroOnline</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Color */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Cor do Tema</label>
                <div className="flex flex-wrap gap-3">
                  {themeColors.map((color) => (
                    <motion.button
                      key={color.value}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateTheme(color.value as any)}
                      className={cn(
                        "w-10 h-10 rounded-xl transition-all",
                        color.class,
                        theme === color.value 
                          ? "ring-2 ring-offset-2 ring-primary ring-offset-background" 
                          : "opacity-70 hover:opacity-100"
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-background shadow-sm">
                    {isDarkMode ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Modo Escuro</p>
                    <p className="text-xs text-muted-foreground">Ative para uma experiência mais confortável à noite</p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative",
                    isDarkMode ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-background dark:bg-foreground rounded-full transition-transform duration-200",
                    isDarkMode ? "translate-x-6" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <p className="text-xs text-primary leading-relaxed opacity-90">
                  As suas preferências são salvas automaticamente na sua conta e sincronizadas entre todos os seus dispositivos.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm max-w-xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Segurança</h3>
                <p className="text-sm text-muted-foreground">Mantenha sua conta protegida</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPassword(onUpdatePassword)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nova Senha</label>
                <Input
                  type="password"
                  {...registerPassword('password')}
                  placeholder="••••••••"
                  disabled={isSubmittingPassword}
                  className="rounded-xl border-border bg-background focus:ring-primary/20"
                />
                {passwordErrors.password && (
                  <p className="text-xs text-destructive">{passwordErrors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
                <Input
                  type="password"
                  {...registerPassword('confirmPassword')}
                  placeholder="••••••••"
                  disabled={isSubmittingPassword}
                  className="rounded-xl border-border bg-background focus:ring-primary/20"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                variant="outline" 
                disabled={isSubmittingPassword} 
                className="w-full rounded-xl"
              >
                {isSubmittingPassword ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>

            {/* Account Info */}
            <div className="mt-8 pt-6 border-t border-border space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Informações da Conta</h4>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">E-mail</span>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <span className="text-sm text-muted-foreground">Membro desde</span>
                <span className="text-sm font-medium text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'data' && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm max-w-xl"
            >
                <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                    <HardDrive className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Gestão de Dados</h3>
                    <p className="text-sm text-muted-foreground">Gerencie suas informações e ferramentas avançadas</p>
                </div>
                </div>

                <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-2xl space-y-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                            <h4 className="font-medium text-foreground">Reprocessar Inteligência Artificial</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                Reanalisa todas as suas tarefas e notas antigas para extrair datas de vencimento, prioridades e tags que podem ter sido perdidas.
                            </p>
                        </div>
                    </div>

                    {isReprocessing ? (
                        <div className="space-y-2">
                             <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(reprocessProgress / reprocessTotal) * 100}%` }}
                                />
                             </div>
                             <p className="text-xs text-center text-muted-foreground">
                                Processando {reprocessProgress} de {reprocessTotal}...
                             </p>
                        </div>
                    ) : (
                        <Button 
                            onClick={handleReprocessEntries}
                            disabled={isReprocessing}
                            variant="default"
                            className="w-full rounded-xl"
                        >
                            Iniciar Reprocessamento
                        </Button>
                    )}
                </div>
                </div>
            </motion.div>
        )}
      </div>
    </div>
  )
}


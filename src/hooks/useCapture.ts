import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'

export interface ClassificationResult {
    category_slug: string
    entry_type: 'task' | 'note' | 'insight' | 'bookmark'
    metadata: any
}

export function useCapture() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (text: string) => {
            if (!user) throw new Error('User not authenticated')

            // 1. Call Edge Function to classify
            const { data: classification, error: aiError } = await supabase.functions.invoke<ClassificationResult>('classify-entry', {
                body: { content: text }
            })

            if (aiError) throw aiError

            // Default fallback
            const targetSlug = classification?.category_slug || 'ideas'
            
            // 2. Resolve Category ID from slug
            // Using 'any' cast to bypass temporary TS inference issues with the generated types
            // @ts-ignore
            const { data: categories, error: catError } = await (supabase as any)
                .from('categories')
                .select('id, name')
                .eq('slug', targetSlug)
                .single()

            // @ts-ignore
            const categoryId = categories?.id

            // Validate Entry Type (Postgres Check Constraint is case sensitive)
            const validTypes = ['task', 'note', 'insight', 'bookmark']
            let entryType = (classification?.entry_type || 'note').toLowerCase()
            if (!validTypes.includes(entryType)) {
                entryType = 'note'
            }

            // 3. Save to Supabase
            // @ts-ignore
            const { data: entry, error: dbError } = await (supabase as any)
                .from('entries')
                .insert({
                    user_id: user.id,
                    content: text,
                    category_id: categoryId, // If undefined, Supabase treats as null (which is allowed)
                    entry_type: entryType,
                    metadata: classification?.metadata || {},
                    status: 'pending'
                })
                .select()
                .single()

            if (dbError) throw dbError

            // @ts-ignore
            return { entry, categoryName: categories?.name }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['entries'] }) // Correct query key format
            toast.success(`Salvo em ${data.categoryName || 'Inbox'}`, {
                description: 'Classificado com sucesso pela IA',
                icon: '✨'
            })
        },
        onError: (error: any) => {
            console.error(error)
            toast.error('Erro ao salvar nota', {
                description: error.message || 'Tente novamente.'
            })
        }
    })
}

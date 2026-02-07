import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { Subject, Entry } from '@/types/supabase'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TagInput, TagSuggestions } from '@/components/features/TagInput'

interface EditEntryDialogProps {
    entry: Entry
    onClose: () => void
}

export function EditEntryDialog({ entry, onClose }: EditEntryDialogProps) {
    const [content, setContent] = useState(entry.content)
    const [entryType, setEntryType] = useState(entry.entry_type || 'note')
    const [status, setStatus] = useState(entry.status || 'pending')
    const [subjectId, setSubjectId] = useState<string | null>(entry.subject_id)
    const [tags, setTags] = useState<string[]>(entry.tags || [])
    const queryClient = useQueryClient()

    // Fetch subjects for dropdown
    const { data: subjects } = useQuery<Subject[]>({
        queryKey: ['subjects'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('name', { ascending: true })
            if (error) throw error
            return data
        }
    })

    const updateMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from('entries')
                // @ts-ignore
                .update({
                    content,
                    entry_type: entryType,
                    status,
                    subject_id: subjectId,
                    tags,
                })
                .eq('id', entry.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entries'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            toast.success('Item atualizado com sucesso!')
            onClose()
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar', { description: error.message })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('entries').delete().eq('id', entry.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entries'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            toast.success('Item excluído')
            onClose()
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir', { description: error.message })
        },
    })

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Editar Item</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Conteúdo
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full min-h-[100px] p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                placeholder="Digite o conteúdo..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tipo
                                </label>
                                <select
                                    value={entryType}
                                    onChange={(e) => setEntryType(e.target.value as any)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                                >
                                    <option value="task">Tarefa</option>
                                    <option value="note">Nota</option>
                                    <option value="insight">Insight</option>
                                    <option value="bookmark">Bookmark</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                                >
                                    <option value="pending">Pendente</option>
                                    <option value="in_progress">Em Progresso</option>
                                    <option value="done">Concluído</option>
                                </select>
                            </div>
                        </div>

                        {/* Subject Selection */}
                        {subjects && subjects.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <BookOpen className="h-4 w-4" />
                                    Matéria
                                </label>
                                <select
                                    value={subjectId || ''}
                                    onChange={(e) => setSubjectId(e.target.value || null)}
                                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                                >
                                    <option value="">Nenhuma matéria</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.icon} {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tags */}
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            placeholder="Adicionar tag..."
                        />
                        <TagSuggestions
                            currentTags={tags}
                            onAddTag={(tag) => setTags([...tags, tag])}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate()}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => updateMutation.mutate()}
                                disabled={updateMutation.isPending || !content.trim()}
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

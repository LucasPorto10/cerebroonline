import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { Database } from '@/types/supabase'
import { Calendar, Pencil, Trash2, Tag, Clock, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { EditEntryDialog } from '@/components/features/EditEntryDialog'

type Entry = Database['public']['Tables']['entries']['Row']

interface CardViewProps {
    categorySlug: string
    title: string
}

export function CardView({ categorySlug, title }: CardViewProps) {
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
    const queryClient = useQueryClient()

    const { data: entries, refetch } = useQuery<Entry[]>({
        queryKey: ['entries', categorySlug],
        queryFn: async () => {
            const { data: category } = await (supabase as any)
                .from('categories')
                .select('id')
                .eq('slug', categorySlug)
                .single()

            if (!category) return []

            const { data } = await (supabase as any)
                .from('entries')
                .select('*')
                .eq('category_id', category.id)
                .order('created_at', { ascending: false })

            return data as Entry[]
        }
    })

    const deleteEntry = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await (supabase as any).from('entries').delete().eq('id', id)
        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Item removido')
            refetch()
            queryClient.invalidateQueries({ queryKey: ['stats'] })
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-amber-100 text-amber-700 border-amber-200'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'done': return 'Concluído'
            case 'in_progress': return 'Em Progresso'
            default: return 'Pendente'
        }
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {entries?.length || 0} {entries?.length === 1 ? 'item' : 'itens'}
                        </p>
                    </div>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {entries?.map((entry, index) => (
                            <motion.div
                                layout
                                key={entry.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                                whileHover={{ y: -4, boxShadow: '0 12px 40px -12px rgba(0,0,0,0.15)' }}
                                onClick={() => setEditingEntry(entry)}
                                className="group relative bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm cursor-pointer transition-all overflow-hidden"
                            >
                                {/* Gradient Top Border */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider border ${getStatusColor(entry.status || 'pending')}`}>
                                            {getStatusLabel(entry.status || 'pending')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); }}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => deleteEntry(entry.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <p className="text-slate-800 font-medium leading-relaxed line-clamp-3 mb-4 min-h-[72px]">
                                    {entry.content}
                                </p>

                                {/* Tags */}
                                {(entry.metadata as any)?.tags && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {(entry.metadata as any).tags.slice(0, 3).map((tag: string) => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-600 font-medium">
                                                <Tag className="h-2.5 w-2.5" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                        Editar <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {entries?.length === 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
                    >
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Calendar className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-500">Nenhum item encontrado</p>
                        <p className="text-sm mt-1">Use o Magic Input na Home para adicionar</p>
                    </motion.div>
                )}
            </div>

            {/* Edit Dialog */}
            {editingEntry && (
                <EditEntryDialog
                    entry={editingEntry}
                    onClose={() => setEditingEntry(null)}
                />
            )}
        </>
    )
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { Database } from '@/types/supabase'
import { CheckCircle2, Circle, Clock, Pencil, Trash2, ListTodo, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { EditEntryDialog } from '@/components/features/EditEntryDialog'

type Entry = Database['public']['Tables']['entries']['Row']

interface TaskViewProps {
    categorySlug: string
}

export function TaskView({ categorySlug }: TaskViewProps) {
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
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

    const filteredEntries = entries?.filter(entry => {
        if (filter === 'all') return true
        if (filter === 'pending') return entry.status !== 'done'
        if (filter === 'done') return entry.status === 'done'
        return true
    })

    const stats = {
        total: entries?.length || 0,
        pending: entries?.filter(e => e.status === 'pending').length || 0,
        inProgress: entries?.filter(e => e.status === 'in_progress').length || 0,
        done: entries?.filter(e => e.status === 'done').length || 0,
    }

    const getCategoryTitle = (slug: string) => {
        switch (slug) {
            case 'home': return 'Doméstico'
            case 'work': return 'Trabalho'
            case 'uni': return 'Faculdade'
            default: return slug
        }
    }

    return (
        <>
            <div className="space-y-6 max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                            {getCategoryTitle(categorySlug)}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {stats.pending} pendentes, {stats.done} concluídas
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {[
                            { key: 'all', label: 'Todas', count: stats.total },
                            { key: 'pending', label: 'Pendentes', count: stats.pending + stats.inProgress },
                            { key: 'done', label: 'Concluídas', count: stats.done },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key as any)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                                    filter === tab.key 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Progress Bar */}
                {stats.total > 0 && (
                    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(stats.done / stats.total) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                )}

                {/* Task List */}
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {filteredEntries?.map((entry, index) => (
                            <TaskItem 
                                key={entry.id} 
                                entry={entry} 
                                index={index}
                                onUpdate={() => {
                                    refetch()
                                    queryClient.invalidateQueries({ queryKey: ['stats'] })
                                }}
                                onEdit={() => setEditingEntry(entry)}
                            />
                        ))}
                    </AnimatePresence>

                    {filteredEntries?.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-16 text-slate-400"
                        >
                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <ListTodo className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-500">
                                {filter === 'done' ? 'Nenhuma tarefa concluída' : 'Nenhuma tarefa pendente'}
                            </p>
                        </motion.div>
                    )}
                </div>
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

interface TaskItemProps {
    entry: Entry
    index: number
    onUpdate: () => void
    onEdit: () => void
}

function TaskItem({ entry, index, onUpdate, onEdit }: TaskItemProps) {
    const [isToggling, setIsToggling] = useState(false)

    const toggleStatus = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsToggling(true)
        const newStatus = entry.status === 'done' ? 'pending' : 'done'

        const { error } = await (supabase as any)
            .from('entries')
            .update({ status: newStatus })
            .eq('id', entry.id)

        if (error) {
            toast.error('Erro ao atualizar tarefa')
        } else {
            toast.success(newStatus === 'done' ? '✓ Tarefa concluída!' : 'Tarefa reaberta')
            onUpdate()
        }
        setIsToggling(false)
    }

    const deleteEntry = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await (supabase as any).from('entries').delete().eq('id', entry.id)
        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Tarefa removida')
            onUpdate()
        }
    }

    const getStatusIcon = () => {
        if (entry.status === 'done') {
            return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        }
        if (entry.status === 'in_progress') {
            return <CircleDot className="h-5 w-5 text-blue-500" />
        }
        return <Circle className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
            transition={{ delay: index * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
            onClick={onEdit}
            className={cn(
                "group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer",
                entry.status === 'done' && "bg-slate-50/50 border-slate-100"
            )}
        >
            {/* Checkbox */}
            <button
                onClick={toggleStatus}
                disabled={isToggling}
                className="flex-shrink-0 transition-transform hover:scale-110"
            >
                {getStatusIcon()}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-slate-900 font-medium transition-all",
                    entry.status === 'done' && "line-through text-slate-400"
                )}>
                    {entry.content}
                </p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {entry.status === 'in_progress' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                            Em Progresso
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                <button
                    onClick={deleteEntry}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </motion.div>
    )
}

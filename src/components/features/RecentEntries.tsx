import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/api/supabase'
import { Circle, Clock, Pencil } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { EditEntryDialog } from './EditEntryDialog'

import { Database } from '@/types/supabase'

type DbEntry = Database['public']['Tables']['entries']['Row']
type Entry = DbEntry & {
    categories: {
        name: string
        color: string
        icon: string
    } | null
}

export function RecentEntries() {
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

    const { data: entries, isLoading } = useQuery({
        queryKey: ['entries', 'recent'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('entries')
                .select(`
                    *,
                    categories (name, color, icon)
                `)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) throw error
            return data as Entry[]
        }
    })

    if (isLoading) {
        return <div className="text-center text-slate-400 py-10">Carregando suas memórias...</div>
    }

    if (!entries?.length) {
        return (
            <div className="text-center text-slate-400 py-10">
                <p>Nada aqui ainda.</p>
                <p className="text-sm">Use o Magic Input acima para criar sua primeira nota!</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-4 w-full max-w-2xl mx-auto mt-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-semibold text-slate-900">Recentes</h2>
                </div>

                <div className="space-y-2">
                    {entries.map((entry, index) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group flex items-center gap-3 p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl transition-all hover:shadow-sm cursor-pointer"
                            onClick={() => setEditingEntry(entry)}
                        >
                            <button className="text-slate-400 hover:text-emerald-500 transition-colors">
                                <Circle className="h-5 w-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className="text-slate-900 font-medium truncate">{entry.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {entry.categories && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${entry.categories.color?.replace('bg-', 'bg-opacity-10 text-') || 'bg-slate-100 text-slate-600'}`}>
                                            {entry.categories.name}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-300 uppercase">
                                    {entry.entry_type}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingEntry(entry); }}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-500 transition-all rounded-lg hover:bg-indigo-50"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
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

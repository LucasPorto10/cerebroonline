
import { MagicInput } from '@/components/features/MagicInput'
import { RecentEntries } from '@/components/features/RecentEntries'
import { useCapture } from '@/hooks/useCapture'
import { useStats } from '@/hooks/useStats'
import { useAuth } from '@/providers/auth-provider'
import { motion } from 'framer-motion'
import { FileJson, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { fetchAllEntries, exportToJSON, exportToCSV } from '@/lib/export'
import { toast } from 'sonner'

export default function Home() {
    const { user } = useAuth()
    const captureMutation = useCapture()
    const { data: statsData, isLoading: statsLoading } = useStats()
    const [exporting, setExporting] = useState(false)

    const stats = [
        { 
            label: 'Pendentes', 
            value: statsLoading ? '...' : String(statsData?.pending ?? 0), 
            color: 'bg-emerald-500', 
            bgLight: 'bg-emerald-50' 
        },
        { 
            label: 'Em Progresso', 
            value: statsLoading ? '...' : String(statsData?.inProgress ?? 0), 
            color: 'bg-blue-500', 
            bgLight: 'bg-blue-50' 
        },
        { 
            label: 'Notas', 
            value: statsLoading ? '...' : String(statsData?.notes ?? 0), 
            color: 'bg-indigo-500', 
            bgLight: 'bg-indigo-50' 
        },
        { 
            label: 'Ideias', 
            value: statsLoading ? '...' : String(statsData?.ideas ?? 0), 
            color: 'bg-amber-500', 
            bgLight: 'bg-amber-50' 
        },
    ]

    const handleExport = async (format: 'json' | 'csv') => {
        setExporting(true)
        try {
            const entries = await fetchAllEntries()
            if (entries.length === 0) {
                toast.warning('Nenhum item para exportar')
                return
            }
            if (format === 'json') {
                exportToJSON(entries)
            } else {
                exportToCSV(entries)
            }
        } catch (error: any) {
            toast.error('Erro ao exportar', { description: error.message })
        } finally {
            setExporting(false)
        }
    }

    return (
        <motion.div
            className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header */}
            <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
            >
                <h1 className="text-3xl font-bold tracking-tighter text-slate-900 sm:text-4xl">
                    Olá, {user?.user_metadata.full_name?.split(' ')[0] || 'Viajante'}
                </h1>
                <p className="text-lg text-slate-500 max-w-[600px]">
                    Esvazie sua mente. Deixe a IA organizar tudo para você.
                </p>
            </motion.div>

            {/* Magic Input */}
            <motion.div
                className="w-full px-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <MagicInput
                    onSend={(text) => captureMutation.mutate(text)}
                    disabled={captureMutation.isPending}
                />
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mt-12">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        className={`flex flex-col items-center p-4 rounded-xl border border-slate-100 shadow-sm cursor-pointer transition-colors ${stat.bgLight} hover:border-slate-200`}
                    >
                        <motion.div
                            className={`w-3 h-3 rounded-full mb-2 ${stat.color}`}
                            animate={{
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                repeat: Infinity,
                                repeatDelay: 3 + index,
                                duration: 0.5,
                            }}
                        />
                        <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {stat.label}
                        </span>
                    </motion.div>
                ))}
            </div>

            {/* Export Buttons */}
            <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
            >
                <button
                    onClick={() => handleExport('json')}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <FileJson className="h-4 w-4" />
                    Exportar JSON
                </button>
                <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Exportar CSV
                </button>
            </motion.div>

            {/* Recent Entries */}
            <motion.div
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <RecentEntries />
            </motion.div>
        </motion.div>
    )
}

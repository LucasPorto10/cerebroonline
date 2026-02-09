import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    format, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths,
    isToday,
    isFuture
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface GoalCompletionCalendarProps {
    completedDates: Date[]
    onToggleDate: (date: Date) => void
    goalColor?: string
    periodType: 'weekly' | 'monthly'
}

export function GoalCompletionCalendar({ 
    completedDates, 
    onToggleDate
}: GoalCompletionCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
        
        return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    }, [currentMonth])

    const isDateCompleted = (date: Date) => {
        return completedDates.some(d => isSameDay(d, date))
    }

    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

    // Calculate streak
    const currentStreak = useMemo(() => {
        const sortedDates = [...completedDates].sort((a, b) => b.getTime() - a.getTime())
        let streak = 0
        let currentDate = new Date()
        
        for (const date of sortedDates) {
            const diffDays = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays <= 1) {
                streak++
                currentDate = date
            } else {
                break
            }
        }
        
        return streak
    }, [completedDates])

    return (
        <div className="bg-card border border-border rounded-2xl p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-semibold text-foreground capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Streak indicator */}
            {currentStreak > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20"
                >
                    <span className="text-lg">🔥</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'} seguidos!
                    </span>
                </motion.div>
            )}

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                    <div 
                        key={day} 
                        className="text-center text-xs font-medium text-muted-foreground py-1"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    const isCompleted = isDateCompleted(day)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isTodayDate = isToday(day)
                    const isFutureDate = isFuture(day)

                    return (
                        <motion.button
                            key={index}
                            whileHover={{ scale: isFutureDate ? 1 : 1.1 }}
                            whileTap={{ scale: isFutureDate ? 1 : 0.95 }}
                            onClick={() => !isFutureDate && onToggleDate(day)}
                            disabled={isFutureDate}
                            className={cn(
                                "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative",
                                !isCurrentMonth && "opacity-30",
                                isFutureDate && "cursor-not-allowed opacity-40",
                                isTodayDate && !isCompleted && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                                isCompleted
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "hover:bg-muted text-foreground"
                            )}
                        >
                            {isCompleted ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                format(day, 'd')
                            )}
                        </motion.button>
                    )
                })}
            </div>

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-2xl font-bold text-foreground">{completedDates.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-amber-500">{currentStreak}</p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-emerald-500">
                        {Math.round((completedDates.filter(d => isSameMonth(d, currentMonth)).length / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()) * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Do mês</p>
                </div>
            </div>
        </div>
    )
}

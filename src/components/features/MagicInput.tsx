'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

interface MagicInputProps {
    onSend: (text: string) => void
    disabled?: boolean
}

export function MagicInput({ onSend, disabled }: MagicInputProps) {
    const [text, setText] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [text])

    const handleSubmit = async () => {
        if (!text.trim() || disabled) return

        try {
            await onSend(text)
            setText('')
            // Reset height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.focus()
            }
        } catch (error) {
            console.error("Failed to send", error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div
            className={cn(
                "relative w-full max-w-2xl mx-auto transition-all duration-300 rounded-2xl border bg-white shadow-sm group",
                isFocused ? "border-indigo-400 shadow-md ring-4 ring-indigo-50" : "border-slate-200 hover:border-slate-300"
            )}
        >
            <div className="relative flex flex-col p-2">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="O que está na sua mente? (ex: 'Comprar café', 'Ideia de app...')"
                    className="w-full min-h-[60px] max-h-[300px] p-4 pr-16 text-lg bg-transparent border-none resize-none focus:ring-0 placeholder:text-slate-400 text-slate-900 leading-relaxed scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent outline-none"
                    disabled={disabled}
                    rows={1}
                />

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {disabled ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Processando...</span>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {text.trim() && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={handleSubmit}
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors"
                                >
                                    <Send className="h-4 w-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* AI Hint */}
            <div className={cn(
                "absolute -bottom-8 left-4 flex items-center gap-1.5 text-xs text-slate-400 transition-opacity duration-300",
                isFocused ? "opacity-100" : "opacity-0"
            )}>
                <Sparkles className="h-3 w-3 text-indigo-400" />
                <span>Powered by Gemini AI</span>
            </div>
        </div>
    )
}

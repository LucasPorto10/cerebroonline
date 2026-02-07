import { Home, Briefcase, GraduationCap, Lightbulb, Settings, ChevronLeft, ChevronRight, LogOut, Menu, X, LayoutGrid } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { AnimatePresence, motion } from 'framer-motion'

const navItems = [
  { icon: Home, label: 'Dashboard', slug: '/' },
  { icon: LayoutGrid, label: 'Kanban', slug: '/kanban' },
  { icon: Briefcase, label: 'Doméstico', slug: '/home' },
  { icon: Briefcase, label: 'Trabalho', slug: '/work' },
  { icon: GraduationCap, label: 'Faculdade', slug: '/uni' },
  { icon: Lightbulb, label: 'Ideias', slug: '/ideas' },
]

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { signOut } = useAuth()

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.slug || (item.slug === '/' && location.pathname === '/dashboard')
          return (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.slug === '/' ? '/dashboard' : item.slug}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group relative',
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                )}
              >
                <item.icon
                  className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-slate-900' : 'text-slate-500')}
                />
                <span className={cn('truncate transition-all duration-300', collapsed && !mobileOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto')}>
                  {item.label}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 flex flex-col gap-1">
        <Link to="/settings" className="w-full" onClick={() => setMobileOpen(false)}>
          <Button variant="ghost" className="w-full justify-start gap-3 px-3">
            <Settings className="h-5 w-5 shrink-0" />
            <span className={cn('truncate transition-all duration-300', collapsed && !mobileOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto')}>
              Configurações
            </span>
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start gap-3 px-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={signOut}>
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={cn('truncate transition-all duration-300', collapsed && !mobileOpen ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto')}>
            Sair
          </span>
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <h1 className="font-bold text-slate-900 tracking-tight text-lg">MindSync</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />

            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <h1 className="font-bold text-slate-900 tracking-tight">MindSync</h1>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex relative bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex-col',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <h1
            className={cn(
              'font-bold text-slate-900 tracking-tight transition-opacity',
              collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
            )}
          >
            MindSync
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'absolute bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 z-10 transition-all',
              collapsed ? 'left-1/2 -translate-x-1/2 top-4' : '-right-4 top-5'
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <SidebarContent />
      </aside>

      {/* Mobile spacer for fixed header */}
      <div className="md:hidden h-16" />
    </>
  )
}

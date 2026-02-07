import { Sidebar } from './sidebar'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export const Shell: React.FC = () => {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:px-12 md:py-8 lg:px-16 min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

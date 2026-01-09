import * as React from "react"
import { create } from 'zustand'
import { X } from "lucide-react"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

// Toast Component
const Toast: React.FC<ToastProps> = ({ 
  id, 
  title, 
  description, 
  type = 'info',
  onClose 
}) => {
  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  const textColors = {
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900'
  }

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div className={`${bgColors[type]} border rounded-lg shadow-lg p-4 mb-2 animate-slide-up`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-xl">{icons[type]}</div>
          <div className="flex-1">
            {title && (
              <h4 className={`font-semibold ${textColors[type]} mb-1`}>
                {title}
              </h4>
            )}
            {description && (
              <p className={`text-sm ${textColors[type]}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className={`${textColors[type]} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Toast Store
interface ToastStore {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    set((state) => ({ toasts: [...state.toasts, newToast] }))
    
    const duration = toast.duration || 5000
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }))
    }, duration)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}))

// Toast Hook
export const useToast = () => {
  const { addToast } = useToastStore()
  
  return {
    toast: {
      success: (title: string, description?: string) =>
        addToast({ title, description, type: 'success' }),
      error: (title: string, description?: string) =>
        addToast({ title, description, type: 'error' }),
      warning: (title: string, description?: string) =>
        addToast({ title, description, type: 'warning' }),
      info: (title: string, description?: string) =>
        addToast({ title, description, type: 'info' })
    }
  }
}

// Toast Container
export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
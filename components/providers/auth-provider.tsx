'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

interface User {
    id: string
    name: string
    email: string
    permissions: {
        inventory: boolean
        sales: boolean
        quotations: boolean
        clients: boolean
        tags: boolean
        admin: boolean
        simulations: boolean
        requisicoes: boolean
    }
}

interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    login: async () => {},
    logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        checkAuth()
    }, [pathname])

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me')
            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
                setIsAuthenticated(true)
            } else if (pathname !== '/login') {
                router.push('/login')
            }
        } catch (error) {
            console.error('Auth check failed:', error)
            if (pathname !== '/login') {
                router.push('/login')
            }
        }
    }

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include', // Important for cookies
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to login')
            }

            const userData = await response.json()
            setUser(userData)
            setIsAuthenticated(true)
            
            // Force a hard navigation to ensure proper page reload
            window.location.href = '/'
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    const logout = async () => {
        try {
            // First clear the state
            setUser(null)
            setIsAuthenticated(false)
            
            // Then make the API call
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            })
        } catch (error) {
            console.error('Logout failed:', error)
        } finally {
            // Ensure we navigate after everything else
            router.push('/login')
        }
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext) 
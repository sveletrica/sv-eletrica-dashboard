'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
    isAuthenticated: boolean
    setIsAuthenticated: (value: boolean) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    setIsAuthenticated: () => {},
    logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const checkAuth = () => {
            const auth = localStorage.getItem('isAuthenticated')
            const authCookie = document.cookie.includes('auth=true')
            
            const isAuth = auth === 'true' && authCookie
            setIsAuthenticated(isAuth)
            setIsLoading(false)

            if (!isAuth) {
                document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
                localStorage.removeItem('isAuthenticated')
            }
        }

        checkAuth()
    }, [])

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated && pathname !== '/login') {
                router.push('/login')
            } else if (isAuthenticated && pathname === '/login') {
                router.push('/')
            }
        }
    }, [isAuthenticated, isLoading, pathname, router])

    const logout = () => {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        localStorage.removeItem('isAuthenticated')
        setIsAuthenticated(false)
        router.push('/login')
    }

    if (isLoading) {
        return null
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext) 
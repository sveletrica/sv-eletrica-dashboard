'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
    isAuthenticated: boolean
    logout: () => void
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const auth = localStorage.getItem('isAuthenticated')
        setIsAuthenticated(auth === 'true')

        if (!auth && pathname !== '/login') {
            router.push('/login')
        }
    }, [pathname, router])

    const logout = () => {
        document.cookie = 'auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        localStorage.removeItem('isAuthenticated')
        setIsAuthenticated(false)
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext) 
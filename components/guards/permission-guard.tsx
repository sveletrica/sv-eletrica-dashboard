'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

interface PermissionGuardProps {
    permission: 'inventory' | 'sales' | 'quotations' | 'clients' | 'tags' | 'admin'
    children: React.ReactNode
}

export function PermissionGuard({ permission, children }: PermissionGuardProps) {
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user && !user.permissions[permission]) {
            toast.error('Você não tem permissão para acessar esta página')
            router.push('/')
        }
    }, [user, permission, router])

    if (!user || !user.permissions[permission]) {
        return null
    }

    return <>{children}</>
}
'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function Nav() {
    const { logout } = useAuth()

    return (
        <nav className="flex justify-between items-center p-4 border-b">
            <div>
                {/* Your existing nav content */}
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
            </Button>
        </nav>
    )
} 
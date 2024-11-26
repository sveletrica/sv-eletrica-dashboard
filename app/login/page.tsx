'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Login() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        // Check if already authenticated
        const isAuthenticated = localStorage.getItem('isAuthenticated')
        if (isAuthenticated === 'true') {
            router.push('/')
        }
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password === process.env.NEXT_PUBLIC_AUTH_PASSWORD) {
            // Set both cookie and localStorage
            document.cookie = 'auth=true; path=/'
            localStorage.setItem('isAuthenticated', 'true')
            router.push('/')
        } else {
            setError('Senha incorreta')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-sm">
                <CardHeader className="space-y-4">
                    <div className="flex justify-center">
                        <div className="relative w-36 h-8">
                            <Image
                                src="/logo-sv.png"
                                alt="SV Elétrica Logo"
                                fill
                                className="object-contain dark:brightness-0 dark:invert"
                                priority
                            />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="text-center"
                            />
                            {error && (
                                <p className="text-sm text-destructive text-center">{error}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full">
                            Entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
} 
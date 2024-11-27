'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import Image from 'next/image'
import { Eye, EyeOff, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Login() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { setIsAuthenticated } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            if (password === process.env.NEXT_PUBLIC_AUTH_PASSWORD) {
                document.cookie = 'auth=true; path=/'
                localStorage.setItem('isAuthenticated', 'true')
                setIsAuthenticated(true)
                
                setIsSuccess(true)
                
                setTimeout(() => {
                    router.push('/')
                }, 800)
            } else {
                setError('Senha incorreta')
            }
        } catch (err) {
            console.error('Erro durante o login:', err)
            setError('Erro ao fazer login. Tente novamente.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isSuccess) {
            const redirectTimer = setTimeout(() => {
                window.location.href = '/'
            }, 1000)

            return () => clearTimeout(redirectTimer)
        }
    }, [isSuccess])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <AnimatePresence mode="wait">
                {!isSuccess ? (
                    <motion.div
                        key="login-form"
                        initial={{ opacity: 1 }}
                        exit={{ 
                            opacity: 0,
                            filter: 'blur(10px)',
                            scale: 0.8,
                            transition: { duration: 0.5 }
                        }}
                    >
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
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Senha"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="text-center pr-10"
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                disabled={isLoading}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {error && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="text-sm text-destructive text-center"
                                                >
                                                    {error}
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Entrando...' : 'Entrar'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success-check"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                            scale: [0, 1.2, 1],
                            opacity: 1
                        }}
                        transition={{ 
                            duration: 0.5,
                            times: [0, 0.6, 1],
                            ease: "easeOut"
                        }}
                        className="flex items-center justify-center"
                    >
                        <div className="bg-primary text-primary-foreground rounded-full p-4">
                            <Check className="h-12 w-12" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
} 
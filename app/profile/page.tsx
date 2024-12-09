'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, User } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from 'sonner'

export default function Profile() {
    const { user } = useAuth()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem')
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/reset-my-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao alterar senha')
            }

            toast.success('Senha alterada com sucesso')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-4">
            <h1 className="text-2xl md:text-3xl font-bold">Meu Perfil</h1>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Usuário</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={user?.name} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={user?.email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Permissões</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(user?.permissions || {}).map(([key, value]) => (
                                    value && (
                                        <div key={key} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                                            {key}
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Alterar Senha</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Senha Atual</Label>
                                <div className="relative">
                                    <Input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    >
                                        {showCurrentPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Nova Senha</Label>
                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Confirmar Nova Senha</Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Alterando senha...
                                    </>
                                ) : (
                                    'Alterar Senha'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 
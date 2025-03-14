'use client'

import React, { Fragment } from 'react'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Save, Edit, Key, Copy, Eye, EyeOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { generateRandomPassword, formatCredentials } from "@/lib/utils"
import { useClipboard } from '@/hooks/use-clipboard'
import { PermissionGuard } from '@/components/guards/permission-guard'

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

interface UserFormData extends Omit<User, 'id'> {
    password?: string
}

const permissionLabels: Record<keyof User['permissions'], string> = {
    inventory: 'Estoque',
    sales: 'Vendas',
    quotations: 'Orçamentos',
    clients: 'Clientes',
    tags: 'Tags',
    admin: 'Admin',
    simulations: 'Simulações',
    requisicoes: 'Requisições'
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([])
    const [newUser, setNewUser] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        permissions: {
            inventory: false,
            sales: false,
            quotations: false,
            clients: false,
            tags: false,
            admin: false,
            simulations: false,
            requisicoes: false
        }
    })
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [credentialsToShow, setCredentialsToShow] = useState<string>('')
    const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
    const { copy } = useClipboard()
    const [searchQuery, setSearchQuery] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users')
            const data = await response.json()
            if (!response.ok) throw new Error(data.error)
            setUsers(data)
        } catch (err) {
            toast.error('Erro ao carregar usuários')
        }
    }

    const handleAddUser = async () => {
        setError(null)
        setIsLoading(true)

        try {
            // Validate inputs
            if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
                throw new Error('Nome, email e senha são obrigatórios')
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(newUser.email)) {
                throw new Error('Email inválido')
            }

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao criar usuário')
            }

            const savedUser = await response.json()
            setUsers(prev => [...prev, savedUser])
            toast.success('Usuário criado com sucesso')

            // Reset form
            setNewUser({
                name: '',
                email: '',
                password: '',
                permissions: {
                    inventory: false,
                    sales: false,
                    quotations: false,
                    clients: false,
                    tags: false,
                    admin: false,
                    simulations: false,
                    requisicoes: false
                }
            })
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar usuário'
            setError(message)
            toast.error(message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEditUser = async () => {
        if (!editingUser) return

        try {
            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingUser),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error)
            }

            setUsers(prev => 
                prev.map(user => 
                    user.id === editingUser.id ? editingUser : user
                )
            )
            
            setIsEditDialogOpen(false)
            toast.success('Usuário atualizado com sucesso')
        } catch (err) {
            toast.error('Erro ao atualizar usuário')
        }
    }

    const handleResetPassword = async (userId: string) => {
        try {
            // Generate a random password
            const newRandomPassword = generateRandomPassword()

            const response = await fetch(`/api/users/${userId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newRandomPassword }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error)
            }

            // Format credentials for display
            const user = users.find(u => u.id === userId)
            if (!user) throw new Error('User not found')

            const credentials = formatCredentials(user.name, user.email, newRandomPassword)

            setIsResetPasswordDialogOpen(false)
            
            // Show success dialog with credentials
            setCredentialsToShow(credentials)
            setShowCredentialsDialog(true)
            
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao redefinir senha'
            toast.error(message)
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) return

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error)
            }

            setUsers(prev => prev.filter(user => user.id !== userId))
            toast.success('Usuário excluído com sucesso')
        } catch (err) {
            toast.error('Erro ao excluir usuário')
        }
    }

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <PermissionGuard permission="admin">
        <div className="space-y-6 p-4">
            <h1 className="text-2xl md:text-3xl font-bold">Gerenciamento de Usuários</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Novo Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                            <div className="space-y-2 flex-1">
                                <Label>Nome</Label>
                                <Input
                                    placeholder="Nome"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label>Email</Label>
                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label>Senha</Label>
                                <div className="relative">
                                    <Input
                                        placeholder="Senha"
                                        type={showPassword ? "text" : "password"}
                                        value={newUser.password}
                                        onChange={(e) => setNewUser(prev => ({
                                            ...prev,
                                            password: e.target.value
                                        }))}
                                        className="pr-20"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="absolute inset-y-0 right-10 flex items-center pr-3"
                                        onClick={() => setShowPassword(prev => !prev)}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                                        onClick={() => {
                                            const newPassword = generateRandomPassword()
                                            setNewUser(prev => ({
                                                ...prev,
                                                password: newPassword
                                            }))
                                            toast.success('Senha gerada com sucesso')
                                        }}
                                    >
                                        <Key className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Permissões:</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.inventory}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                inventory: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Estoque</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.sales}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                sales: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Vendas</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.quotations}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                quotations: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Orçamentos</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.clients}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                clients: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Clientes</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.tags}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                tags: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Tags</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.admin}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                admin: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Admin</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.simulations}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                simulations: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Simulações</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <Checkbox
                                        checked={newUser.permissions.simulations}
                                        onCheckedChange={(checked) => setNewUser(prev => ({
                                            ...prev,
                                            permissions: {
                                                ...prev.permissions,
                                                simulations: checked as boolean
                                            }
                                        }))}
                                    />
                                    <span>Requisições</span>
                                </label>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}

                        <Button 
                            onClick={handleAddUser} 
                            disabled={isLoading}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Usuário
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                </CardHeader>
                <CardContent className="px-0 sm:px-6">
                    <div className="px-4 sm:px-0 mb-4">
                        <Input
                            placeholder="Buscar usuário..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="hidden sm:table-cell">Nome</TableHead>
                                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                                    <TableHead className="hidden sm:table-cell">Permissões</TableHead>
                                    <TableHead className="hidden sm:table-cell">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell 
                                            colSpan={4} 
                                            className="text-center text-muted-foreground"
                                        >
                                            {users.length === 0 ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <Fragment key={user.id}>
                                            <TableRow className="sm:table-row flex flex-col sm:flex-row">
                                                <TableCell className="sm:font-medium">
                                                    <span className="font-medium sm:hidden">Nome: </span>
                                                    {user.name}
                                                </TableCell>
                                                <TableCell className="break-all">
                                                    <span className="font-medium sm:hidden">Email: </span>
                                                    {user.email}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium sm:hidden block mb-2">Permissões: </span>
                                                    <div className="flex flex-row flex-wrap gap-1">
                                                        {user.permissions.admin && (
                                                            <span 
                                                                key="admin"
                                                                className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded truncate max-w-[100px]"
                                                            >
                                                                admin
                                                            </span>
                                                        )}
                                                        {Object.entries(user.permissions)
                                                            .filter(([key, value]) => value && key !== 'admin')
                                                            .map(([key]) => (
                                                                <span 
                                                                    key={key}
                                                                    className="bg-primary/10 text-primary text-xs px-2 py-1 rounded truncate max-w-[100px]"
                                                                >
                                                                    {key}
                                                                </span>
                                                            ))
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell className="sm:w-[100px]">
                                                    <span className="font-medium sm:hidden block mb-2">Ações: </span>
                                                    <div className="flex flex-row gap-2 justify-end">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingUser(user)
                                                                setIsEditDialogOpen(true)
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingUser(user)
                                                                setIsResetPasswordDialogOpen(true)
                                                            }}
                                                        >
                                                            <Key className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow className="sm:hidden border-b-8 border-background">
                                                <TableCell colSpan={4} className="p-0"></TableCell>
                                            </TableRow>
                                        </Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={editingUser?.name || ''}
                                onChange={(e) => setEditingUser(prev => prev ? {
                                    ...prev,
                                    name: e.target.value
                                } : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={editingUser?.email || ''}
                                onChange={(e) => setEditingUser(prev => prev ? {
                                    ...prev,
                                    email: e.target.value
                                } : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Permissões</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(permissionLabels).map(([key, label]) => (
                                    <label key={key} className="flex items-center space-x-2">
                                        <Checkbox
                                            checked={editingUser?.permissions[key as keyof User['permissions']] || false}
                                            onCheckedChange={(checked) => setEditingUser(prev => prev ? {
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    [key]: checked as boolean
                                                }
                                            } : null)}
                                        />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <Button onClick={handleEditUser} className="w-full">
                            Salvar Alterações
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reset Password Confirmation Dialog */}
            <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redefinir Senha</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-muted-foreground">
                            Uma nova senha aleatória será gerada para este usuário. 
                            Deseja continuar?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsResetPasswordDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => editingUser && handleResetPassword(editingUser.id)}
                                variant="default"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Credentials Display Dialog */}
            <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novas Credenciais</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <pre className="bg-muted p-4 rounded-lg whitespace-pre-wrap break-all text-sm">
                                {credentialsToShow}
                            </pre>
                            <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() => copy(credentialsToShow)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Copie estas credenciais e envie para o usuário de forma segura.
                            Elas não estarão disponíveis novamente após fechar esta janela.
                        </p>
                        <Button 
                            className="w-full"
                            onClick={() => {
                                copy(credentialsToShow)
                                setShowCredentialsDialog(false)
                            }}
                        >
                            Copiar e Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
        </PermissionGuard>
    )
} 
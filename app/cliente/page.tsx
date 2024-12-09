'use client'
import { PermissionGuard } from '@/components/guards/permission-guard'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Loader2, AlertCircle, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDebounce } from 'use-debounce'
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpDown } from "lucide-react"
import Link from 'next/link'
import { Input } from "@/components/ui/input"

// IndexedDB configuration
const DB_NAME = 'clients_db'
const STORE_NAME = 'clients'
const DB_VERSION = 1
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface Client {
    nmpessoa: string
    vlfaturamento: number | null
    nrpedidos: number | null
}

// Helper function to open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' })
            }
        }
    })
}

// Helper class to manage client data
const clientsDB = {
    async needsUpdate(): Promise<boolean> {
        try {
            const db = await openDB()
            const transaction = db.transaction(STORE_NAME, 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const records = request.result
                    if (records.length === 0) return resolve(true)

                    const lastUpdate = records[0].timestamp
                    resolve(Date.now() - lastUpdate > CACHE_DURATION)
                }
                request.onerror = () => resolve(true)
            })
        } catch (error) {
            console.error('Error checking cache:', error)
            return true
        }
    },

    async updateCache(clients: Client[]): Promise<void> {
        try {
            const db = await openDB()
            const transaction = db.transaction(STORE_NAME, 'readwrite')
            const store = transaction.objectStore(STORE_NAME)

            // Clear old data
            await new Promise<void>((resolve, reject) => {
                const clearRequest = store.clear()
                clearRequest.onerror = () => reject(clearRequest.error)
                clearRequest.onsuccess = () => resolve()
            })

            // Store new data
            const record = {
                timestamp: Date.now(),
                data: clients
            }

            return new Promise((resolve, reject) => {
                const request = store.add(record)
                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve()
            })
        } catch (error) {
            console.error('Error updating cache:', error)
        }
    },

    async searchClients(query: string): Promise<Client[]> {
        try {
            const db = await openDB()
            const transaction = db.transaction(STORE_NAME, 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const records = request.result
                    if (records.length === 0) return resolve([])

                    const clients = records[0].data as Client[]
                    if (!query) return resolve(clients)

                    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const filtered = clients
                        .filter(client => 
                            client.nmpessoa
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .includes(normalizedQuery)
                        )
                    resolve(filtered)
                }
                request.onerror = () => resolve([])
            })
        } catch (error) {
            console.error('Error searching clients:', error)
            return []
        }
    }
}

// Add these types
type SortField = 'nmpessoa' | 'vlfaturamento' | 'nrpedidos'
type SortOrder = 'asc' | 'desc'

const MOBILE_ITEMS_PER_PAGE = 10
const DESKTOP_ITEMS_PER_PAGE = 15

// Add this helper function
const isMobile = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
}

// Add this type for the event handler
interface InputChangeEvent extends React.ChangeEvent<HTMLInputElement> {
    target: HTMLInputElement
}

export default function ClientSearch() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isCaching, setIsCaching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch] = useDebounce(searchTerm, 150)
    const [sortField, setSortField] = useState<SortField>('nmpessoa')
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
    const [currentPage, setCurrentPage] = useState(1)
    const [allClients, setAllClients] = useState<Client[]>([])
    const [itemsPerPage, setItemsPerPage] = useState(DESKTOP_ITEMS_PER_PAGE)

    // Add this effect to handle screen size changes
    useEffect(() => {
        const handleResize = () => {
            setItemsPerPage(isMobile() ? MOBILE_ITEMS_PER_PAGE : DESKTOP_ITEMS_PER_PAGE)
        }

        handleResize() // Set initial value
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Modify the updateCache effect to store all clients
    useEffect(() => {
        const updateCache = async () => {
            try {
                console.log('Checking if cache needs update...')
                const needsUpdate = await clientsDB.needsUpdate()
                console.log('Cache needs update:', needsUpdate)
                
                if (needsUpdate) {
                    setIsCaching(true)
                    console.log('Fetching clients from API...')
                    const response = await fetch('/api/clientes?mode=full')
                    const data = await response.json()
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to fetch clients')
                    }
                    
                    console.log(`Updating cache with ${data.items.length} clients...`)
                    await clientsDB.updateCache(data.items)
                    setAllClients(data.items)
                    console.log('Cache updated successfully')
                } else {
                    // Load from cache
                    const results = await clientsDB.searchClients('')
                    setAllClients(results)
                }
            } catch (err: any) {
                console.error('Cache update error:', err)
                setError(err.message || 'Failed to update cache')
            } finally {
                setIsCaching(false)
            }
        }

        updateCache()
    }, [])

    // Add sorting and pagination logic
    const sortedAndFilteredClients = useMemo(() => {
        let filtered = [...allClients]
        
        if (searchTerm) {
            const normalizedQuery = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            filtered = filtered.filter(client => 
                client.nmpessoa
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .includes(normalizedQuery)
            )
        }

        return filtered.sort((a, b) => {
            const multiplier = sortOrder === 'asc' ? 1 : -1
            
            if (sortField === 'nmpessoa') {
                return multiplier * a.nmpessoa.localeCompare(b.nmpessoa)
            }
            
            const aValue = a[sortField] || 0
            const bValue = b[sortField] || 0
            return multiplier * (aValue - bValue)
        })
    }, [allClients, searchTerm, sortField, sortOrder])

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return sortedAndFilteredClients.slice(startIndex, startIndex + itemsPerPage)
    }, [sortedAndFilteredClients, currentPage, itemsPerPage])

    const totalPages = Math.ceil(sortedAndFilteredClients.length / itemsPerPage)

    const handleSelect = (client: string) => {
        setSelectedClient(client)
        setOpen(false)
        router.push(`/cliente/${encodeURIComponent(client)}`)
    }

    if (error) {
        return (
            <div className="container mx-auto py-10">
                <Card className="max-w-2xl mx-auto border-red-200">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <CardTitle>Erro</CardTitle>
                        </div>
                        <CardDescription className="text-red-500">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={() => window.location.reload()}
                            variant="outline"
                        >
                            Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <PermissionGuard permission="clients">
        <div className="container mx-auto py-10 p-0">
            <Card className="max-w-full mx-auto">
                <CardHeader>
                    <CardTitle>Clientes</CardTitle>
                    <CardDescription>
                        {isCaching ? 
                            'Atualizando cache de clientes...' : 
                            'Selecione um cliente para ver seus detalhes'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Input
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e: InputChangeEvent) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[200px]">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'nmpessoa') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('nmpessoa')
                                                    setSortOrder('asc')
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            Cliente
                                            <ArrowUpDown className="h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="min-w-[120px]">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'vlfaturamento') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('vlfaturamento')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            Faturamento
                                            <ArrowUpDown className="h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="min-w-[100px]">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                if (sortField === 'nrpedidos') {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                                } else {
                                                    setSortField('nrpedidos')
                                                    setSortOrder('desc')
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            Pedidos
                                            <ArrowUpDown className="h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map((client) => (
                                    <TableRow key={client.nmpessoa}>
                                        <TableCell>
                                            <Link
                                                href={`/cliente/${encodeURIComponent(client.nmpessoa)}`}
                                                className="text-blue-500 hover:text-blue-700 underline"
                                            >
                                                {client.nmpessoa}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="pl-6">
                                            {new Intl.NumberFormat('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            }).format(client.vlfaturamento || 0)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {client.nrpedidos || 0}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between px-2 py-4 gap-4">
                        <p className="text-sm text-muted-foreground text-center md:text-left">
                            Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, sortedAndFilteredClients.length)} até{" "}
                            {Math.min(currentPage * itemsPerPage, sortedAndFilteredClients.length)} de{" "}
                            {sortedAndFilteredClients.length} resultados
                        </p>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </Button>
                            <div className="text-sm font-medium">
                                Página {currentPage} de {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Próximo
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        </PermissionGuard>
    )
}
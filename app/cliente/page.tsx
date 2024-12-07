'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Loader2, AlertCircle, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDebounce } from 'use-debounce'
import { ScrollArea } from "@/components/ui/scroll-area"

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
                    if (!query) return resolve(clients.slice(0, 10))

                    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const filtered = clients
                        .filter(client => 
                            client.nmpessoa
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .includes(normalizedQuery)
                        )
                        .slice(0, 10)

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

    // Check and update cache if needed
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
                    console.log('Cache updated successfully')
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

    // Handle search
    useEffect(() => {
        if (!open) return

        const searchClients = async () => {
            setIsLoading(true)
            try {
                console.log('Searching clients with query:', debouncedSearch)
                const results = await clientsDB.searchClients(debouncedSearch)
                console.log(`Found ${results.length} results`)
                setClients(results)
            } catch (err: any) {
                console.error('Search error:', err)
                setError(err.message || 'Failed to search clients')
            } finally {
                setIsLoading(false)
            }
        }

        searchClients()
    }, [debouncedSearch, open])

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
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Buscar Cliente</CardTitle>
                    <CardDescription>
                        {isCaching ? 
                            'Atualizando cache de clientes...' : 
                            'Selecione um cliente para ver seus detalhes'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                                disabled={isCaching}
                            >
                                {selectedClient || "Selecione um cliente..."}
                                {isCaching ? (
                                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                            <Command>
                                <CommandInput
                                    placeholder="Buscar cliente..."
                                    value={searchTerm}
                                    onValueChange={setSearchTerm}
                                />
                                <CommandList>
                                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        <ScrollArea className="h-[250px]">
                                            {clients.map((client) => (
                                                <CommandItem
                                                    key={client.nmpessoa}
                                                    value={client.nmpessoa}
                                                    onSelect={handleSelect}
                                                    className="flex items-center justify-between py-3"
                                                >
                                                    <div className="flex items-center">
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedClient === client.nmpessoa ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <span>{client.nmpessoa}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span title="Total Faturado">
                                                            {new Intl.NumberFormat('pt-BR', {
                                                                style: 'currency',
                                                                currency: 'BRL'
                                                            }).format(client.vlfaturamento || 0)}
                                                        </span>
                                                        <span title="Número de Pedidos" className="flex items-center">
                                                            <Package className="mr-1 h-4 w-4" />
                                                            {client.nrpedidos || 0}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </ScrollArea>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>
        </div>
    )
}
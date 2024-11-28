"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Home, BarChart2, Package, Menu, X, ShoppingCart } from 'lucide-react'
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024)
            if (window.innerWidth >= 1024) {
                setIsOpen(true)
            } else {
                setIsOpen(false)
            }
        }

        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)
        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    return (
        <>
            {/* Mobile Menu Button */}
            {isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-4 left-4 z-50 lg:hidden hover:bg-accent"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
                >
                    {isOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )}
                </Button>
            )}

            {/* Backdrop */}
            {isMobile && isOpen && (
                <div 
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "min-h-screen h-full bg-card border-r",
                "fixed lg:sticky top-0 left-0 z-40",
                "transition-transform duration-300 ease-in-out",
                "w-48 shrink-0",
                "absolute lg:relative",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="sticky top-0 bg-card z-20 border-b">
                    <div className="p-6 flex justify-between items-center">
                        <div className="relative w-36 h-8">
                            <Image
                                src="/logo-sv.png"
                                alt="SV Elétrica Logo"
                                fill
                                className="object-contain dark:brightness-0 dark:invert"
                                priority
                            />
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
                <nav className="p-2">
                    <Link 
                        href="/" 
                        className="flex items-center gap-2 px-4 py-3 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <Home size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link 
                        href="/inventory" 
                        className="flex items-center gap-2 px-4 py-3 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <Package size={20} />
                        <span>Estoque</span>
                    </Link>
                    <Link 
                        href="/vendas-dia" 
                        className="flex items-center gap-2 px-4 py-3 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <ShoppingCart size={20} />
                        <span>Vendas Dia</span>
                    </Link>
                    <div className="px-4 py-3 font-semibold text-muted-foreground text-sm">Lojas</div>
                    <Link 
                        href="/sobral" 
                        className="flex items-center gap-2 px-4 py-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <BarChart2 size={20} />
                        <span>Sobral</span>
                    </Link>
                    <Link 
                        href="/maracanau" 
                        className="flex items-center gap-2 px-4 py-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <BarChart2 size={20} />
                        <span>Maracanau</span>
                    </Link>
                    <Link 
                        href="/caucaia" 
                        className="flex items-center gap-2 px-4 py-2 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
                        onClick={() => isMobile && setIsOpen(false)}
                    >
                        <BarChart2 size={20} />
                        <span>Caucaia</span>
                    </Link>
                </nav>
            </div>
        </>
    )
}
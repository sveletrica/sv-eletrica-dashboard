"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Home, BarChart2, Package, Menu, X, ShoppingCart, BarChart3, CalendarDays, TrendingUp, ChevronLeft } from 'lucide-react'
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const sidebarLinks = [
    {
        href: '/',
        label: 'Dashboard',
        icon: Home,
    },
    {
        href: '/inventory',
        label: 'Estoque',
        icon: Package,
    },
    {
        href: '/vendas-dia',
        label: 'Vendas do Dia',
        icon: CalendarDays,
    },
    {
        href: '/vendas-mes',
        label: 'Vendas do Mês',
        icon: TrendingUp,
    },
    {
        href: '/produtos',
        label: 'Produtos',
        icon: BarChart3,
    },
    {
        href: '/sobral',
        label: 'Sobral',
        icon: BarChart2,
    },
    {
        href: '/maracanau',
        label: 'Maracanau',
        icon: BarChart2,
    },
    {
        href: '/caucaia',
        label: 'Caucaia',
        icon: BarChart2,
    },
] as const

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)

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
                "transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-48",
                "shrink-0",
                "absolute lg:relative",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="sticky top-0 bg-card z-20 border-b">
                    <div className={cn(
                        "flex flex-col gap-4",
                        isCollapsed ? "p-3" : "p-4"
                    )}>
                        {/* Logo Container */}
                        <div className={cn(
                            "flex justify-center",
                            isCollapsed ? "px-1" : "px-2"
                        )}>
                            <div className={cn(
                                "relative",
                                isCollapsed ? "w-10 h-10" : "w-40 h-10"
                            )}>
                                <Image
                                    src={isCollapsed ? "/logo lottie.svg" : "/logo-sv.png"}
                                    alt="SV Elétrica Logo"
                                    fill
                                    className={cn(
                                        "object-contain",
                                        !isCollapsed && "dark:brightness-0 dark:invert"
                                    )}
                                    priority
                                />
                            </div>
                        </div>

                        {/* Buttons Container */}
                        <div className={cn(
                            "flex items-center justify-center",
                            isCollapsed ? "flex-col gap-1" : "gap-2"
                        )}>
                            <ThemeToggle />
                            {!isMobile && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsCollapsed(!isCollapsed)}
                                    className="hidden lg:flex"
                                    aria-label={isCollapsed ? "Expandir" : "Recolher"}
                                >
                                    <ChevronLeft className={cn(
                                        "h-4 w-4 transition-transform",
                                        isCollapsed && "rotate-180"
                                    )} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <nav className="p-2">
                    {sidebarLinks.map((link) => (
                        <Link 
                            key={link.href}
                            href={link.href} 
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-foreground rounded-md hover:bg-accent hover:text-accent-foreground",
                                isCollapsed && "px-2 justify-center"
                            )}
                            onClick={() => isMobile && setIsOpen(false)}
                            title={isCollapsed ? link.label : undefined}
                        >
                            <link.icon size={20} />
                            {!isCollapsed && <span>{link.label}</span>}
                        </Link>
                    ))}
                </nav>
            </div>
        </>
    )
}
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ContactRound, Home, BarChart2, Package, Menu, X, ShoppingCart, BarChart3, CalendarDays, TrendingUp, ChevronLeft, Calculator, LogOut, LogIn, User, ClipboardCheck } from 'lucide-react';
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';

const sidebarLinks = [
    {
        href: '/',
        label: 'Dashboard',
        icon: Home,
        permission: null,
    },
    {
        href: '/inventory',
        label: 'Estoque',
        icon: Package,
        permission: 'inventory' as const,
    },
    {
        href: '/vendas-dia',
        label: 'Vendas do Dia',
        icon: CalendarDays,
        permission: 'sales' as const,
    },
    {
        href: '/vendas-mes',
        label: 'Vendas do Mês',
        icon: TrendingUp,
        permission: 'sales' as const,
    },
    {
        href: '/orcamento',
        label: 'Orçamento',
        icon: Calculator,
        permission: 'quotations' as const,
    },
    {
        href: '/simulacao',
        label: 'Simulações',
        icon: Calculator,
        permission: 'simulations' as const,
    },
    {
        href: '/requisicao',
        label: 'Requisições',
        icon: ClipboardCheck,
        permission: 'requisicoes' as const,
    },
    {
        href: '/produto',
        label: 'Produtos',
        icon: BarChart3,
        permission: 'inventory' as const,
    },
    {
        href: '/cliente',
        label: 'Clientes',
        icon: ContactRound,
        permission: 'clients' as const,
    },
    {
        href: '/users',
        label: 'Usuários',
        icon: User,
        permission: 'admin' as const,
    },
    {
        href: '/admin/sql-logs',
        label: 'Logs SQL',
        icon: BarChart2,
        permission: 'admin' as const,
    },
] as const;

const storeLinks = [
    {
        href: '/sobral',
        label: 'Sobral',
        icon: BarChart2,
        permission: 'tags' as const,
    },
    {
        href: '/maracanau',
        label: 'Maracanau',
        icon: BarChart2,
        permission: 'tags' as const,
    },
    {
        href: '/mozart',
        label: 'Mozart',
        icon: BarChart2,
        permission: 'tags' as const,
    },
] as const;

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { user, logout } = useAuth();

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth >= 1024) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

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
            <aside className={cn(
                "h-full bg-card border-r",
                "fixed lg:sticky top-0 left-0 z-40",
                "transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-48",
                "shrink-0",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="flex flex-col h-full">
                    <div className="bg-card border-b">
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
                    <div className="flex-1 overflow-y-auto">
                        <nav className="p-2">
                            {sidebarLinks.map((link) => (
                                (!link.permission || (user?.permissions[link.permission])) && (
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
                                )
                            ))}

                            {/* Store Links Section */}
                            {user?.permissions.tags && (
                                <>
                                    <div className={cn(
                                        "mx-2 my-4 h-[1px] bg-border",
                                        isCollapsed && "mx-1"
                                    )} />

                                    {!isCollapsed && (
                                        <div className="px-4 py-2">
                                            <h2 className="text-sm font-semibold text-muted-foreground">
                                                Etiquetas
                                            </h2>
                                        </div>
                                    )}

                                    {storeLinks.map((link) => (
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
                                </>
                            )}

                            <div className="mt-auto space-y-2">
                                {user ? (
                                    <>
                                        <Link
                                            href="/profile"
                                            className={cn(
                                                "block px-3 py-2 hover:bg-accent rounded-md transition-colors",
                                                isCollapsed && "hidden"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4" />
                                                <span className="truncate">{user.name}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {user.email}
                                            </div>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full",
                                                isCollapsed ? "px-2 justify-center" : "justify-start"
                                            )}
                                            onClick={handleLogout}
                                            title={isCollapsed ? "Sair" : undefined}
                                        >
                                            <LogOut className="h-4 w-4" />
                                            {!isCollapsed && <span className="ml-2">Sair</span>}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full",
                                            isCollapsed ? "px-2 justify-center" : "justify-start"
                                        )}
                                        onClick={() => window.location.href = '/login'}
                                        title={isCollapsed ? "Entrar" : undefined}
                                    >
                                        <LogIn className="h-4 w-4" />
                                        {!isCollapsed && <span className="ml-2">Entrar</span>}
                                    </Button>
                                )}
                            </div>
                        </nav>
                    </div>
                </div>
            </aside>
        </>
    );
}
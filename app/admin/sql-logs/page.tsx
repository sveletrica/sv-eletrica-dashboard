'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../components/providers/auth-provider';
import { createPublicClient } from '../../../lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SQLImportLog {
    id: string
    user_id: string
    user_name: string
    order_number: string
    timestamp: string
    created_at: string
}

export default function SQLLogsPage() {
    const [logs, setLogs] = useState<SQLImportLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated && user?.permissions.admin) {
            fetchLogs();
        }
    }, [isAuthenticated, user]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const supabase = createPublicClient();

            const { data, error } = await supabase
                .from('sql_import_logs')
                .select('*')
                .order('timestamp', { ascending: false });

            if (error) {
                throw error;
            }

            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching SQL import logs:', error);
            toast.error('Falha ao carregar logs de importação SQL');
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !user?.permissions.admin) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>
                            Você não tem permissão para acessar esta página.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Logs de Importação SQL</CardTitle>
                    <CardDescription>
                        Monitoramento de uso da ferramenta de importação SQL
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <p>Carregando logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Nenhum log de importação SQL encontrado</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Código do Pedido</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                                            </TableCell>
                                            <TableCell>{log.user_name}</TableCell>
                                            <TableCell>{log.order_number}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 
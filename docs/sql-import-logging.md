# SQL Import Logging System

Este sistema foi implementado para monitorar o uso da ferramenta de importação SQL na aplicação. Ele registra informações sobre quem está utilizando a funcionalidade, quando e quais pedidos estão sendo importados.

## Estrutura do Sistema

O sistema de logging consiste em:

1. Uma tabela no Supabase para armazenar os logs
2. Uma API para registrar os logs
3. Uma página de administração para visualizar os logs
4. Integração com o componente de importação SQL existente

## Configuração do Supabase

Para configurar a tabela de logs no Supabase, execute a migração SQL fornecida:

```sql
-- Arquivo: supabase/migrations/20240601000000_create_sql_import_logs_table.sql

-- Create a table for SQL import logs
CREATE TABLE IF NOT EXISTS sql_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE sql_import_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only authenticated users to view their own logs
CREATE POLICY "Users can view their own logs" 
  ON sql_import_logs 
  FOR SELECT 
  USING (auth.uid()::text = user_id);

-- Create policy to allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own logs" 
  ON sql_import_logs 
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow admins to view all logs
CREATE POLICY "Admins can view all logs" 
  ON sql_import_logs 
  FOR SELECT 
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );

-- Create index on user_id for faster queries
CREATE INDEX idx_sql_import_logs_user_id ON sql_import_logs(user_id);

-- Create index on timestamp for faster date range queries
CREATE INDEX idx_sql_import_logs_timestamp ON sql_import_logs(timestamp);
```

## Componentes do Sistema

### 1. API de Logging

A API de logging está localizada em `app/api/logs/sql-import/route.ts` e é responsável por receber os dados de log e armazená-los no Supabase.

### 2. Integração com o Componente de Importação SQL

O componente `ImportSQLDialog` em `app/simulacao/page.tsx` foi modificado para enviar logs para a API sempre que um usuário importa dados SQL.

### 3. Página de Administração

Uma página de administração foi criada em `app/admin/sql-logs/page.tsx` para permitir que administradores visualizem os logs de importação SQL.

## Acesso à Página de Logs

A página de logs SQL está disponível apenas para usuários com permissão de administrador. Um link para a página foi adicionado ao menu lateral na seção de administração.

## Dados Registrados

Os seguintes dados são registrados para cada importação SQL:

- ID do usuário
- Nome do usuário
- Número do pedido importado
- Data e hora da importação

## Segurança

O sistema utiliza as políticas de segurança do Supabase (Row Level Security) para garantir que:

1. Usuários comuns só podem ver seus próprios logs
2. Apenas administradores podem ver todos os logs
3. Os logs não podem ser modificados ou excluídos pelos usuários 
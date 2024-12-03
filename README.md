# SV Elétrica Dashboard

Um dashboard desenvolvido em Next.js para gerenciamento de inventário e operações da SV Elétrica por Diogo Elias.

## Funcionalidades Principais

- **Inventário em Tempo Real**
  - Visualização completa do estoque
  - Busca avançada com highlight
  - Ordenação e filtragem personalizável
  - Colunas redimensionáveis e reordenáveis
  - Cache local para melhor performance

- **Produtos Sem Etiqueta**
  - Lista de produtos que precisam de etiquetagem
  - Exportação para Excel
  - Atualização em tempo real

## Arquitetura do Projeto

### Core Components

#### Layout Principal
- **RootLayout** (`app/layout.tsx`)
  - Theme provider
  - Auth provider
  - Sidebar
  - Font configurations (Sora e Roboto)

#### Sidebar (`components/sidebar.tsx`)
- Logo
- Theme toggle
- Links de navegação para:
  - Dashboard
  - Inventário
  - Vendas Diárias
  - Vendas Mensais
  - Produtos
  - Lojas (Sobral, Maracanau, Caucaia)

### Componentes UI

#### Componentes Base
- **Card** (`components/ui/card.tsx`)
  - CardHeader
  - CardContent
  - CardTitle
  - CardDescription
  - CardFooter

#### Componentes de Dados
- **Chart** (`components/ui/chart.tsx`)
  - Gráficos de barra
  - Tooltips customizados
  - Container responsivo

#### Outros Componentes UI
- `context-menu.tsx` - Menu de contexto personalizado
- `dropdown-menu.tsx` - Menu dropdown reutilizável
- `input.tsx` - Componente de input estilizado
- `select.tsx` - Componente de select customizado
- `skeleton.tsx` - Componente de loading skeleton
- `theme-toggle.tsx` - Alternador de tema claro/escuro

## Estrutura de Rotas

### Autenticação
- `/login` - Página de login com proteção por senha
- `middleware.ts` - Gerenciamento de autenticação e redirecionamentos

### Páginas Principais
- **/** - Dashboard
  - Estatísticas de inventário
  - Métricas de vendas mensais
  - Visão geral de vendas diárias

### Gestão de Inventário
- `/inventory` - Gerenciamento principal do inventário
- `/sem-etiqueta` - Página de itens sem etiqueta

### Análise de Vendas
- `/vendas-dia`
  - Dados detalhados de vendas
  - Opções de filtro
  - Seleção de data
- `/vendas-mes`
  - Gráficos e comparativos
  - Métricas de performance por loja

### Rotas por Loja
- `/sobral` - Analytics da loja Sobral
- `/maracanau` - Analytics da loja Maracanau
- `/caucaia` - Analytics da loja Caucaia

## Tecnologias Utilizadas

- [Next.js 14](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Table](https://tanstack.com/table/v8)
- [date-fns](https://date-fns.org/)
- [Fuse.js](https://fusejs.io/)

## Começando

### Pré-requisitos

- Node.js 18.17 ou superior
- npm ou pnpm

### Instalação

1. Clone o repositório
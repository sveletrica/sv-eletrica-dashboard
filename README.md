# SV Elétrica Dashboard

Um dashboard desenvolvido em Next.js para gerenciamento de inventário, etiquetas eletrônicas e operações da SV Elétrica.

## Funcionalidades Principais

- **Inventário em Tempo Real**
  - Visualização completa do estoque
  - Busca avançada com highlight
  - Ordenação e filtragem personalizável
  - Colunas redimensionáveis e reordenáveis
  - Cache local para melhor performance

- **Gerenciamento de Etiquetas Eletrônicas**
  - Monitoramento de etiquetas em uso
  - Identificação de produtos sem etiqueta
  - Detecção de etiquetas duplicadas
  - Função "flash" para localizar etiquetas fisicamente

- **Analytics de Vendas**
  - Dashboard com métricas diárias e mensais
  - Visualização por vendedor e filial
  - Gráficos de performance
  - Comparativo com metas

## Páginas e Funcionalidades

### Dashboard Principal (/)
Página inicial que apresenta uma visão geral das principais métricas do negócio, incluindo:
- Resumo das vendas do dia
- Performance mensal comparada com metas
- Indicadores de estoque crítico
- Visualização rápida do status de etiquetas eletrônicas

### Inventário (/inventory)
Sistema completo de gestão de inventário com:
- Tabela interativa com todos os produtos em estoque
- Filtros por grupo, categoria e disponibilidade
- Busca por código, nome ou características
- Visualização detalhada das quantidades por filial
- Gerenciamento de imagens dos produtos
- Exportação de relatórios

### Etiquetas Eletrônicas
Conjunto de páginas para gerenciamento de etiquetas eletrônicas (ESL):

#### Mozart (/mozart)
- Dashboard específico da loja Mozart
- Visualização de etiquetas em uso vs. produtos sem etiqueta
- Estatísticas de produtos etiquetados e estoque
- Função de atualização remota das etiquetas

#### Etiquetas em Uso - Mozart (/etiquetas-em-uso-mozart)
- Lista detalhada de todos os produtos com etiquetas ativas
- Informações sobre preço, estoque e localização
- Status da última atualização de cada etiqueta

#### Sem Etiqueta - Mozart (/sem-etiqueta-mozart)
- Produtos que necessitam de etiquetas na loja Mozart
- Priorização por disponibilidade e vendas
- Ferramentas para impressão de relatórios

#### Páginas similares para Maracanau e Sobral
- /maracanau e /sobral - Dashboards específicos de cada loja
- /etiquetas-em-uso-maracanau e /etiquetas-em-uso-sobral - Etiquetas ativas
- /sem-etiqueta-maracanau e /sem-etiqueta-sobral - Produtos sem etiqueta

### Vendas

#### Vendas Diárias (/vendas-dia)
- Visualização detalhada das vendas do dia atual
- Filtros por vendedor, filial e categoria de produto
- Detalhamento de pedidos e itens
- Comparativo com dias anteriores

#### Vendas Mensais (/vendas-mes)
- Análise de performance mensal
- Gráficos de tendência e sazonalidade
- Comparativo entre filiais
- Acompanhamento de metas e projeções

#### Vendedor (/vendedor/[nmrepresentantevenda])
- Dashboard específico por vendedor
- Histórico de vendas e performance
- Rankings e comparativo com equipe
- Análise de produtos mais vendidos

### Produto (/produto/[cdproduto])
- Visualização detalhada de um produto específico
- Histórico de preços e estoque
- Gerenciamento de imagens
- Informações de fornecedores e categorias

### Orçamentos (/orcamento)
- Sistema de cotações e simulações
- Geração de pedidos de compra
- Cálculo de preços e descontos
- Histórico de cotações por cliente

### Usuários (/users)
- Gerenciamento de usuários do sistema
- Controle de permissões e acesso
- Funções administrativas

## Tecnologias Utilizadas

- [Next.js 15](https://nextjs.org/) - Framework React com App Router
- [React 18](https://reactjs.org/) - Biblioteca JavaScript para interfaces
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
- [ShadCN UI](https://ui.shadcn.com/) - Componentes de UI
- [TanStack Table](https://tanstack.com/table/v8) - Gerenciamento avançado de tabelas
- [Recharts](https://recharts.org/) - Biblioteca de gráficos e visualizações
- [Supabase](https://supabase.com/) - Backend e autenticação
- [SWR](https://swr.vercel.app/) - Estratégias de atualização de dados

## Começando

### Pré-requisitos

- Node.js 18.17 ou superior
- npm

### Instalação

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente seguindo o exemplo em `.env.example`
4. Execute o servidor de desenvolvimento: `npm run dev`
5. Acesse http://localhost:3000

### Comandos Principais

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run build` - Construir versão de produção
- `npm run start` - Iniciar servidor de produção
- `npm run lint` - Executar verificação de código com ESLint
- `npm run lint:fix` - Corrigir problemas detectados pelo ESLint

## Desenvolvimento

Consulte o arquivo [CLAUDE.md](./CLAUDE.md) para orientações detalhadas sobre o estilo de código e boas práticas adotadas neste projeto.
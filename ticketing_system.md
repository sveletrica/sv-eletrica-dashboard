-- Estrutura do Banco de Dados para Help Desk Tickets (Supabase/PostgreSQL)
-- Integração com sistema de estoque existente (DBEstoque)
-- Schema dedicado "tkt"

-- Criar schema dedicado
CREATE SCHEMA IF NOT EXISTS tkt;

-- Habilitar extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Usuários
CREATE TABLE tkt.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL, -- Armazenar hash da senha
    tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('operador', 'solicitante', 'admin')),
    departamento TEXT,
    cargo TEXT,
    data_cadastro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMPTZ,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de Filiais
CREATE TABLE tkt.filiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo INTEGER NOT NULL UNIQUE, -- Código da empresa no sistema de estoque (ex: 17, 1, 4, etc)
    nome TEXT NOT NULL,
    endereco TEXT,
    telefone TEXT,
    responsavel TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Mapear códigos das filiais do sistema de estoque
INSERT INTO tkt.filiais (id, codigo, nome, ativo) VALUES 
(uuid_generate_v4(), 1, 'Empresa 1', TRUE),
(uuid_generate_v4(), 4, 'Empresa 4', TRUE),
(uuid_generate_v4(), 12, 'Empresa 12', TRUE),
(uuid_generate_v4(), 13, 'Empresa 13', TRUE),
(uuid_generate_v4(), 15, 'Empresa 15', TRUE),
(uuid_generate_v4(), 17, 'Empresa 17', TRUE),
(uuid_generate_v4(), 20, 'Empresa 20', TRUE),
(uuid_generate_v4(), 59, 'Empresa 59', TRUE);

-- Tabela de Categorias de Tickets
CREATE TABLE tkt.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    sla_minutos INTEGER, -- Tempo em minutos para resolução
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Prioridades
CREATE TABLE tkt.prioridades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    sla_multiplicador DECIMAL(3,2) DEFAULT 1.0, -- Multiplicador de tempo para o SLA
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Status
CREATE TABLE tkt.status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    cor TEXT, -- Código hexadecimal da cor
    ordem INTEGER, -- Ordem de exibição
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela Principal de Tickets
CREATE TABLE tkt.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE, -- Código formatado para exibição (ex: TK-2024-00001)
    id_solicitante UUID NOT NULL REFERENCES tkt.usuarios(id),
    id_filial_origem UUID NOT NULL REFERENCES tkt.filiais(id),
    id_filial_destino UUID REFERENCES tkt.filiais(id),
    id_categoria UUID NOT NULL REFERENCES tkt.categorias(id),
    id_prioridade UUID NOT NULL REFERENCES tkt.prioridades(id),
    id_status UUID NOT NULL REFERENCES tkt.status(id),
    tipo_venda TEXT CHECK (tipo_venda IN ('Corporativo', 'Varejo')),
    assunto TEXT NOT NULL,
    motivo_transferencia TEXT, -- Motivo da transferência, se aplicável
    numero_pedido TEXT, -- Número do pedido gerado, se aplicável
    data_abertura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMPTZ,
    data_limite_sla TIMESTAMPTZ, -- Data calculada para cumprimento do SLA
    data_ultima_atualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_operador_responsavel UUID REFERENCES tkt.usuarios(id),
    observacao TEXT -- Campo de observações gerais
);

-- Criar índices para melhorar a performance
CREATE INDEX idx_tickets_solicitante ON tkt.tickets(id_solicitante);
CREATE INDEX idx_tickets_status ON tkt.tickets(id_status);
CREATE INDEX idx_tickets_filial_origem ON tkt.tickets(id_filial_origem);
CREATE INDEX idx_tickets_operador ON tkt.tickets(id_operador_responsavel);

-- Tabela de Itens do Ticket (relacionada com o estoque)
CREATE TABLE tkt.ticket_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ticket UUID NOT NULL REFERENCES tkt.tickets(id) ON DELETE CASCADE,
    cd_chamada TEXT NOT NULL, -- Código do produto no sistema de estoque (CdChamada)
    nm_produto TEXT NOT NULL, -- Nome do produto (NmProduto)
    quantidade INTEGER NOT NULL DEFAULT 1,
    observacao TEXT,
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Armazenar informações do estoque no momento da requisição
    estoque_origem NUMERIC, -- Quantidade em estoque na filial de origem no momento da requisição
    preco_unitario NUMERIC, -- Preço unitário do item no momento da requisição
    cd_sigla TEXT, -- Código do fornecedor
    nm_fornecedor TEXT, -- Nome do fornecedor
    nm_grupo_produto TEXT, -- Grupo do produto
    nm_familia_produto TEXT -- Família do produto
);

-- Tabela de Comentários/Histórico
CREATE TABLE tkt.ticket_historico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ticket UUID NOT NULL REFERENCES tkt.tickets(id) ON DELETE CASCADE,
    id_usuario UUID NOT NULL REFERENCES tkt.usuarios(id),
    tipo_registro TEXT NOT NULL CHECK (tipo_registro IN ('comentario', 'mudanca_status', 'transferencia', 'atribuicao')),
    comentario TEXT,
    status_anterior UUID REFERENCES tkt.status(id),
    status_novo UUID REFERENCES tkt.status(id),
    data_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    visivel_para_solicitante BOOLEAN DEFAULT TRUE
);

-- Tabela de Anexos
CREATE TABLE tkt.ticket_anexos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ticket UUID NOT NULL REFERENCES tkt.tickets(id) ON DELETE CASCADE,
    id_usuario UUID NOT NULL REFERENCES tkt.usuarios(id),
    nome_arquivo TEXT NOT NULL,
    tipo_arquivo TEXT,
    tamanho_arquivo BIGINT, -- Em bytes
    caminho_storage TEXT NOT NULL, -- Caminho no bucket do Storage
    data_upload TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Relatórios Salvos
CREATE TABLE tkt.relatorios_salvos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES tkt.usuarios(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    parametros JSONB NOT NULL, -- JSON com os parâmetros do relatório
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ultima_execucao TIMESTAMPTZ
);

-- Tabela de Configurações do Sistema
CREATE TABLE tkt.configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT,
    data_modificacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Notificações
CREATE TABLE tkt.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_usuario UUID NOT NULL REFERENCES tkt.usuarios(id),
    id_ticket UUID REFERENCES tkt.tickets(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Funções e triggers para automação

-- Função para gerar código de ticket
CREATE OR REPLACE FUNCTION tkt.generate_ticket_code()
RETURNS TRIGGER AS $$
DECLARE
    ano TEXT;
    sequencial INTEGER;
    formato TEXT;
BEGIN
    -- Obter o ano atual
    ano := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Obter o próximo número sequencial para o ano atual
    SELECT COUNT(*) + 1 INTO sequencial
    FROM tkt.tickets
    WHERE codigo LIKE 'TK-' || ano || '-%';
    
    -- Formatar o código
    NEW.codigo := 'TK-' || ano || '-' || LPAD(sequencial::TEXT, 5, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código automático
CREATE TRIGGER set_ticket_code
BEFORE INSERT ON tkt.tickets
FOR EACH ROW
EXECUTE FUNCTION tkt.generate_ticket_code();

-- Função para calcular data limite do SLA
CREATE OR REPLACE FUNCTION tkt.calculate_sla_deadline()
RETURNS TRIGGER AS $$
DECLARE
    base_minutes INTEGER;
    multiplicador DECIMAL(3,2);
BEGIN
    -- Obter minutos base da categoria
    SELECT sla_minutos INTO base_minutes
    FROM tkt.categorias
    WHERE id = NEW.id_categoria;
    
    -- Obter multiplicador da prioridade
    SELECT sla_multiplicador INTO multiplicador
    FROM tkt.prioridades
    WHERE id = NEW.id_prioridade;
    
    -- Calcular data limite do SLA se tivermos os valores necessários
    IF base_minutes IS NOT NULL AND multiplicador IS NOT NULL THEN
        NEW.data_limite_sla := NEW.data_abertura + 
                              (base_minutes * multiplicador * INTERVAL '1 minute');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular prazo SLA
CREATE TRIGGER set_sla_deadline
BEFORE INSERT ON tkt.tickets
FOR EACH ROW
EXECUTE FUNCTION tkt.calculate_sla_deadline();

-- Função para atualizar data da última atualização
CREATE OR REPLACE FUNCTION tkt.update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_ultima_atualizacao := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
CREATE TRIGGER update_ticket_last_update
BEFORE UPDATE ON tkt.tickets
FOR EACH ROW
EXECUTE FUNCTION tkt.update_ticket_timestamp();

-- Função para registrar mudanças de status no histórico
CREATE OR REPLACE FUNCTION tkt.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id_status <> NEW.id_status THEN
        INSERT INTO tkt.ticket_historico(
            id_ticket,
            id_usuario,
            tipo_registro,
            status_anterior,
            status_novo,
            comentario,
            visivel_para_solicitante
        ) VALUES (
            NEW.id,
            NEW.id_operador_responsavel, -- Usuário que fez a alteração
            'mudanca_status',
            OLD.id_status,
            NEW.id_status,
            'Status alterado',
            TRUE
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar mudanças de status
CREATE TRIGGER log_ticket_status_change
AFTER UPDATE OF id_status ON tkt.tickets
FOR EACH ROW
EXECUTE FUNCTION tkt.log_status_change();

-- Inserções iniciais para o sistema funcionar

-- Status básicos
INSERT INTO tkt.status (id, nome, descricao, cor, ordem) VALUES 
(uuid_generate_v4(), 'Novo', 'Ticket recém criado', '#3498db', 1),
(uuid_generate_v4(), 'Em Análise', 'Em análise pelo operador', '#f39c12', 2),
(uuid_generate_v4(), 'Em Andamento', 'Ticket sendo trabalhado', '#2ecc71', 3),
(uuid_generate_v4(), 'Aguardando Informações', 'Esperando informações adicionais do solicitante', '#e74c3c', 4),
(uuid_generate_v4(), 'Transferido', 'Ticket transferido para outra filial', '#9b59b6', 5),
(uuid_generate_v4(), 'Resolvido', 'Problema resolvido', '#27ae60', 6),
(uuid_generate_v4(), 'Fechado', 'Ticket encerrado', '#7f8c8d', 7),
(uuid_generate_v4(), 'Cancelado', 'Ticket cancelado', '#c0392b', 8);

-- Prioridades básicas
INSERT INTO tkt.prioridades (id, nome, descricao, sla_multiplicador) VALUES 
(uuid_generate_v4(), 'Baixa', 'Problemas que não impactam diretamente as operações', 1.5),
(uuid_generate_v4(), 'Normal', 'Problemas comuns do dia a dia', 1.0),
(uuid_generate_v4(), 'Alta', 'Problemas que afetam múltiplos usuários', 0.7),
(uuid_generate_v4(), 'Urgente', 'Problemas que afetam operações críticas', 0.5);

-- Configurações básicas do sistema
INSERT INTO tkt.configuracoes (id, chave, valor, descricao, tipo) VALUES 
(uuid_generate_v4(), 'email_notificacoes_ativo', 'true', 'Ativa/desativa o envio de emails de notificação', 'boolean'),
(uuid_generate_v4(), 'dias_auto_fechamento', '3', 'Dias para fechamento automático após resolução', 'integer'),
(uuid_generate_v4(), 'formato_codigo_ticket', 'TK-{ANO}-{SEQUENCIAL}', 'Formato para geração de códigos de tickets', 'string'),
(uuid_generate_v4(), 'max_tamanho_anexo_mb', '10', 'Tamanho máximo permitido para anexos em MB', 'integer');

-- Criar views para facilitar consultas comuns

-- View de tickets com informações completas
CREATE VIEW tkt.vw_tickets_completos AS
SELECT 
    t.id,
    t.codigo,
    t.assunto,
    t.tipo_venda,
    t.motivo_transferencia,
    t.numero_pedido,
    t.observacao,
    t.data_abertura,
    t.data_fechamento,
    t.data_limite_sla,
    t.data_ultima_atualizacao,
    s.nome AS status,
    s.cor AS status_cor,
    p.nome AS prioridade,
    cat.nome AS categoria,
    fo.nome AS filial_origem,
    fo.codigo AS codigo_filial_origem,
    fd.nome AS filial_destino,
    fd.codigo AS codigo_filial_destino,
    us.nome AS solicitante,
    us.email AS solicitante_email,
    uo.nome AS operador_responsavel
FROM 
    tkt.tickets t
    JOIN tkt.status s ON t.id_status = s.id
    JOIN tkt.prioridades p ON t.id_prioridade = p.id
    JOIN tkt.categorias cat ON t.id_categoria = cat.id
    JOIN tkt.filiais fo ON t.id_filial_origem = fo.id
    LEFT JOIN tkt.filiais fd ON t.id_filial_destino = fd.id
    JOIN tkt.usuarios us ON t.id_solicitante = us.id
    LEFT JOIN tkt.usuarios uo ON t.id_operador_responsavel = uo.id;

-- View para itens completos dos tickets
CREATE VIEW tkt.vw_itens_ticket AS
SELECT 
    ti.id,
    ti.id_ticket,
    t.codigo AS ticket_codigo,
    ti.cd_chamada,
    ti.nm_produto,
    ti.quantidade,
    ti.estoque_origem,
    ti.preco_unitario,
    ti.quantidade * ti.preco_unitario AS valor_total,
    ti.cd_sigla,
    ti.nm_fornecedor,
    ti.nm_grupo_produto,
    ti.nm_familia_produto,
    ti.observacao,
    fo.nome AS filial_origem,
    fo.codigo AS codigo_filial_origem,
    fd.nome AS filial_destino,
    fd.codigo AS codigo_filial_destino
FROM 
    tkt.ticket_itens ti
    JOIN tkt.tickets t ON ti.id_ticket = t.id
    JOIN tkt.filiais fo ON t.id_filial_origem = fo.id
    LEFT JOIN tkt.filiais fd ON t.id_filial_destino = fd.id;

-- View para histórico completo
CREATE VIEW tkt.vw_historico_completo AS
SELECT 
    h.id,
    h.id_ticket,
    t.codigo AS ticket_codigo,
    h.tipo_registro,
    h.comentario,
    h.data_registro,
    h.visivel_para_solicitante,
    u.nome AS usuario,
    sa.nome AS status_anterior,
    sn.nome AS status_novo
FROM 
    tkt.ticket_historico h
    JOIN tkt.tickets t ON h.id_ticket = t.id
    JOIN tkt.usuarios u ON h.id_usuario = u.id
    LEFT JOIN tkt.status sa ON h.status_anterior = sa.id
    LEFT JOIN tkt.status sn ON h.status_novo = sn.id
ORDER BY 
    h.data_registro DESC;

-- Função para verificar disponibilidade de estoque
CREATE OR REPLACE FUNCTION tkt.check_estoque_disponibilidade(cd_chamada TEXT, codigo_filial INTEGER, quantidade NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
    estoque_disponivel NUMERIC;
    coluna_estoque TEXT;
BEGIN
    -- Construir nome da coluna de estoque dinâmicamente
    coluna_estoque := 'qtestoque_empresa' || codigo_filial;
    
    -- Consultar estoque disponível (query dinâmica)
    EXECUTE format('
        SELECT %I
        FROM "DBEstoque"
        WHERE "CdChamada" = $1
        LIMIT 1', 
        coluna_estoque
    ) INTO estoque_disponivel USING cd_chamada;
    
    -- Verificar se há estoque suficiente
    RETURN (estoque_disponivel IS NOT NULL AND estoque_disponivel >= quantidade);
END;
$$ LANGUAGE plpgsql;

-- Função para obter preço do produto
CREATE OR REPLACE FUNCTION tkt.get_preco_produto(cd_chamada TEXT, codigo_filial INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    preco NUMERIC;
    coluna_preco TEXT;
BEGIN
    -- Construir nome da coluna de preço dinâmicamente
    coluna_preco := 'vlpreco_empresa' || codigo_filial;
    
    -- Consultar preço (query dinâmica)
    EXECUTE format('
        SELECT %I
        FROM "DBEstoque"
        WHERE "CdChamada" = $1
        LIMIT 1', 
        coluna_preco
    ) INTO preco USING cd_chamada;
    
    RETURN preco;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure para adicionar item ao ticket com validação de estoque
CREATE OR REPLACE PROCEDURE tkt.add_item_to_ticket(
    ticket_id UUID,
    codigo_produto TEXT,
    quantidade_solicitada INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_filial_origem_id UUID;
    v_codigo_filial INTEGER;
    v_produto RECORD;
    v_estoque_disponivel NUMERIC;
    v_preco NUMERIC;
BEGIN
    -- Obter informações da filial de origem
    SELECT t.id_filial_origem, f.codigo INTO v_filial_origem_id, v_codigo_filial
    FROM tkt.tickets t
    JOIN tkt.filiais f ON t.id_filial_origem = f.id
    WHERE t.id = ticket_id;
    
    -- Obter informações do produto do DBEstoque
    EXECUTE format('
        SELECT 
            "CdChamada", 
            "NmProduto", 
            "NmGrupoProduto", 
            "NmFamiliaProduto", 
            "CdSigla", 
            "NmFornecedorPrincipal", 
            "QtEstoque_Empresa%s" as estoque_disponivel, 
            "VlPreco_Empresa%s" as preco
        FROM "DBEstoque"
        WHERE "CdChamada" = $1
        LIMIT 1', 
        v_codigo_filial, v_codigo_filial
    ) INTO v_produto USING codigo_produto;
    
    -- Verificar se o produto existe
    IF v_produto IS NULL THEN
        RAISE EXCEPTION 'Produto não encontrado: %', codigo_produto;
    END IF;
    
    -- Verificar se há estoque suficiente
    IF v_produto.estoque_disponivel < quantidade_solicitada THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', 
            v_produto.estoque_disponivel, quantidade_solicitada;
    END IF;
    
    -- Inserir item no ticket
    INSERT INTO tkt.ticket_itens (
        id_ticket,
        cd_chamada,
        nm_produto,
        quantidade,
        estoque_origem,
        preco_unitario,
        cd_sigla,
        nm_fornecedor,
        nm_grupo_produto,
        nm_familia_produto
    ) VALUES (
        ticket_id,
        v_produto."CdChamada",
        v_produto."NmProduto",
        quantidade_solicitada,
        v_produto.estoque_disponivel,
        v_produto.preco,
        v_produto."CdSigla",
        v_produto."NmFornecedorPrincipal",
        v_produto."NmGrupoProduto",
        v_produto."NmFamiliaProduto"
    );
    
    -- Registrar no histórico
    INSERT INTO tkt.ticket_historico (
        id_ticket,
        id_usuario,
        tipo_registro,
        comentario,
        visivel_para_solicitante
    ) VALUES (
        ticket_id,
        (SELECT id_operador_responsavel FROM tkt.tickets WHERE id = ticket_id),
        'comentario',
        format('Item adicionado: %s (Qtd: %s)', v_produto."NmProduto", quantidade_solicitada),
        TRUE
    );
END; $$;

-- Stored Procedure para transferência entre filiais
CREATE OR REPLACE PROCEDURE tkt.realizar_transferencia(
    ticket_id UUID,
    motivo TEXT,
    numero_pedido TEXT,
    usuario_id UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_status_transferido UUID;
BEGIN
    -- Obter ID do status "Transferido"
    SELECT id INTO v_id_status_transferido
    FROM tkt.status
    WHERE nome = 'Transferido';
    
    -- Atualizar ticket com informações da transferência
    UPDATE tkt.tickets
    SET 
        id_status = v_id_status_transferido,
        motivo_transferencia = motivo,
        numero_pedido = numero_pedido,
        id_operador_responsavel = usuario_id,
        data_ultima_atualizacao = CURRENT_TIMESTAMP
    WHERE id = ticket_id;
    
    -- Registrar a transferência no histórico
    INSERT INTO tkt.ticket_historico (
        id_ticket,
        id_usuario,
        tipo_registro,
        comentario,
        visivel_para_solicitante
    ) VALUES (
        ticket_id,
        usuario_id,
        'transferencia',
        format('Transferência realizada. Motivo: %s. Nº do pedido: %s', motivo, numero_pedido),
        TRUE
    );
END; $$;

-- Adicionar categorias iniciais
INSERT INTO tkt.categorias (id, nome, descricao, sla_minutos) VALUES
(uuid_generate_v4(), 'Transferência de Estoque', 'Transferência de produtos entre filiais', 1440), -- 24 horas
(uuid_generate_v4(), 'Problema com Equipamento', 'Problemas com equipamentos ou produtos', 480), -- 8 horas
(uuid_generate_v4(), 'Solicitação de Informação', 'Dúvidas sobre produtos ou estoque', 240), -- 4 horas
(uuid_generate_v4(), 'Atualização de Cadastro', 'Modificações no cadastro de produtos', 720); -- 12 horas
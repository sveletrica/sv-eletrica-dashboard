// Meta de faturamento mensal por data
export const METAS_FATURAMENTO_POR_DATA: Record<string, Record<string, number>> = {
  "2025": {
    "01": 22185000, // Janeiro 2025
    "02": 20300000  // Fevereiro 2025
  }
};

// Metas por filial, ano e mês
export const METAS_FILIAIS_POR_DATA: Record<string, Record<string, Record<string, number>>> = {
  "2025": {
    "02": { // Fevereiro
      "Corporativo": 17380000,
      "SV WS EXPRESS": 1350000,
      "SV MARACANAU": 700000,
      "SV BM EXPRESS": 450000,
      "SV SOBRAL": 500000
    }
  }
};

// Função para obter a meta geral
export const getMetaGeral = (ano: string, mes: string): number => {
  try {
    return METAS_FATURAMENTO_POR_DATA[ano]?.[mes] || 0;
  } catch {
    return 0;
  }
};

// Função para obter a meta da filial
export const getMetaFilial = (filialNome: string, ano: string, mes: string): number => {
  try {
    return METAS_FILIAIS_POR_DATA[ano]?.[mes]?.[filialNome] || 0;
  } catch {
    return 0;
  }
}; 
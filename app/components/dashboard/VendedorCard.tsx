import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ExternalLink } from 'lucide-react';

interface VendedorFilialData {
  vlfaturamento: number;
  vltotalcustoproduto: number;
  margem: number;
}

interface VendedorData {
  nome: string;
  filiais: {
    [filial: string]: VendedorFilialData;
  };
  total: {
    vlfaturamento: number;
    vltotalcustoproduto: number;
    margem: number;
  };
}

interface VendedorCardProps {
  vendedor: VendedorData;
  getMarginBackgroundColor: (margin: number) => string;
  getMarginTextColor: (margin: number) => string;
}

export function VendedorCard({ vendedor, getMarginBackgroundColor, getMarginTextColor }: VendedorCardProps) {
  return (
    <Card
      className={`${getMarginBackgroundColor(vendedor.total.margem)} cursor-pointer hover:shadow-md transition-shadow relative group`}
      onClick={() => {
        // Abrir em uma nova aba/página
        window.open(`/vendedor/${encodeURIComponent(vendedor.nome)}`, '_blank');
      }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
          <span className="truncate" title={vendedor.nome}>{vendedor.nome}</span>
          <span className={getMarginTextColor(vendedor.total.margem)}>
            {vendedor.total.margem.toFixed(2)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold mb-2">
          {vendedor.total.vlfaturamento.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })}
        </div>
        <div className="space-y-1">
          {Object.entries(vendedor.filiais)
            .sort(([, a], [, b]) => b.vlfaturamento - a.vlfaturamento)
            .map(([filialNome, filialData]) => (
              <div key={filialNome} className="flex justify-between text-sm font-bold">
                <span className="truncate" title={filialNome}>{filialNome}:</span>
                <span className={getMarginTextColor(filialData.margem)}>
                  {new Intl.NumberFormat('pt-BR', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    style: 'currency',
                    currency: 'BRL'
                  }).format(filialData.vlfaturamento)}
                  {' '}({filialData.margem.toFixed(1)}%)
                </span>
              </div>
            ))}
        </div>
      </CardContent>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink size={14} className="text-muted-foreground" />
      </div>
    </Card>
  );
} 
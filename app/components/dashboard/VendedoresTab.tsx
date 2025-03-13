import React from 'react';
import { Card, CardContent } from "../../../components/ui/card";
import { VendedorCard } from './VendedorCard';

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

interface VendedoresTabProps {
  vendedoresPerformance: VendedorData[];
  getMarginBackgroundColor: (margin: number) => string;
  getMarginTextColor: (margin: number) => string;
}

export function VendedoresTab({ 
  vendedoresPerformance, 
  getMarginBackgroundColor, 
  getMarginTextColor 
}: VendedoresTabProps) {
  return (
    <div className="space-y-4">
      {vendedoresPerformance.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {vendedoresPerformance.map(vendedor => (
            <VendedorCard 
              key={vendedor.nome}
              vendedor={vendedor}
              getMarginBackgroundColor={getMarginBackgroundColor}
              getMarginTextColor={getMarginTextColor}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
import React from 'react';
import { Card, CardContent } from "../../../components/ui/card";
import { FilialCard } from './FilialCard';

interface FilialData {
  nome: string;
  vlfaturamento: number;
  vltotalcustoproduto: number;
  margem: number;
  vendedores: number;
}

interface DiasUteisInfo {
  diasUteisTotais: number;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  mediaPorDiaUtil: number;
  projecaoFaturamento: number;
}

interface FiliaisTabProps {
  filiaisPerformance: FilialData[];
  getMarginBackgroundColor: (margin: number) => string;
  getMarginTextColor: (margin: number) => string;
  getProgressColor: (percentage: number) => string;
  diasUteisInfo: DiasUteisInfo;
  calcularProjecaoFilial: (faturamentoAtual: number, filialNome: string, diasUteisInfo: any) => { projecao: number, percentualMeta: number, meta: number };
  getMetaFilial: (filialNome: string, ano: string, mes: string) => number;
  selectedAno: string;
  selectedMes: string;
}

export function FiliaisTab({ 
  filiaisPerformance, 
  getMarginBackgroundColor, 
  getMarginTextColor,
  getProgressColor,
  diasUteisInfo,
  calcularProjecaoFilial,
  getMetaFilial,
  selectedAno,
  selectedMes
}: FiliaisTabProps) {
  return (
    <div className="space-y-4">
      {filiaisPerformance.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filiaisPerformance.map(filial => (
            <FilialCard 
              key={filial.nome}
              filial={filial}
              getMarginBackgroundColor={getMarginBackgroundColor}
              getMarginTextColor={getMarginTextColor}
              getProgressColor={getProgressColor}
              diasUteisInfo={diasUteisInfo}
              calcularProjecaoFilial={calcularProjecaoFilial}
              getMetaFilial={getMetaFilial}
              selectedAno={selectedAno}
              selectedMes={selectedMes}
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
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

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

interface FilialCardProps {
  filial: FilialData;
  getMarginBackgroundColor: (margin: number) => string;
  getMarginTextColor: (margin: number) => string;
  getProgressColor: (percentage: number) => string;
  diasUteisInfo: DiasUteisInfo;
  calcularProjecaoFilial: (faturamentoAtual: number, filialNome: string, diasUteisInfo: any) => { projecao: number, percentualMeta: number, meta: number };
  getMetaFilial: (filialNome: string, ano: string, mes: string) => number;
  selectedAno: string;
  selectedMes: string;
}

export function FilialCard({ 
  filial, 
  getMarginBackgroundColor, 
  getMarginTextColor, 
  getProgressColor,
  diasUteisInfo,
  calcularProjecaoFilial,
  getMetaFilial,
  selectedAno,
  selectedMes
}: FilialCardProps) {
  const monthFormatted = selectedMes.padStart(2, '0');
  const metaFilial = getMetaFilial(filial.nome, selectedAno, monthFormatted);

  return (
    <Card key={filial.nome} className={getMarginBackgroundColor(filial.margem)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
          <span>{filial.nome}</span>
          <span className={getMarginTextColor(filial.margem)}>
            {filial.margem.toFixed(2)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold mb-2">
          {filial.vlfaturamento.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          })}
        </div>
        <div className="flex justify-between text-sm">
          <span>Custo:</span>
          <span>
            {filial.vltotalcustoproduto.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Vendedores:</span>
          <span>{filial.vendedores}</span>
        </div>

        {/* Meta e projeção para a filial */}
        {metaFilial > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Meta mensal:</span>
              <span>{metaFilial.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}</span>
            </div>

            {filial.vlfaturamento < metaFilial ? (
              <div className="flex justify-between text-sm">
                <span>Falta atingir:</span>
                <span className="font-medium">{(metaFilial - filial.vlfaturamento).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span>Meta superada:</span>
                <span className="font-medium text-green-600 dark:text-green-400">{(filial.vlfaturamento - metaFilial).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}</span>
              </div>
            )}

            <div className="mt-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${Math.min(100, (filial.vlfaturamento / metaFilial) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-end mt-1">
                <span className={`text-xs font-medium ${getProgressColor((filial.vlfaturamento / metaFilial) * 100)}`}>
                  {((filial.vlfaturamento / metaFilial) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Informação sobre dias úteis */}
            <div className="mt-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Dias úteis totais:</span>
                <span>{diasUteisInfo.diasUteisTotais}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Dias úteis decorridos:</span>
                <span>{diasUteisInfo.diasUteisDecorridos}</span>
              </div>
              {diasUteisInfo.diasUteisRestantes > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Dias úteis restantes:</span>
                  <span>{diasUteisInfo.diasUteisRestantes}</span>
                </div>
              )}
              {diasUteisInfo.diasUteisDecorridos > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Média por dia útil:</span>
                  <span>{(filial.vlfaturamento / diasUteisInfo.diasUteisDecorridos).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}</span>
                </div>
              )}
            </div>

            {/* Projeção para a filial */}
            {diasUteisInfo.diasUteisDecorridos > 0 && diasUteisInfo.diasUteisRestantes > 0 && (
              <>
                {/* Mostrar mensagem especial quando hoje é o último dia útil */}
                {diasUteisInfo.diasUteisRestantes === 1 &&
                  diasUteisInfo.diasUteisDecorridos + diasUteisInfo.diasUteisRestantes === diasUteisInfo.diasUteisTotais && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                      Hoje é o último dia útil do mês
                    </div>
                  )}

                {(() => {
                  const { projecao, percentualMeta } = calcularProjecaoFilial(
                    filial.vlfaturamento,
                    filial.nome,
                    diasUteisInfo
                  );

                  return (
                    <div className="mt-2 pt-2 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Projeção mensal:</span>
                        <span className={projecao >= metaFilial ?
                          'text-green-600 dark:text-green-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        }>
                          {projecao.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </div>

                      <div className="mt-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${projecao >= metaFilial ? 'bg-green-600' : 'bg-yellow-600'}`}
                            style={{ width: `${Math.min(100, percentualMeta)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end mt-1">
                          <span className={`text-xs font-medium ${getProgressColor(percentualMeta)}`}>
                            {percentualMeta.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
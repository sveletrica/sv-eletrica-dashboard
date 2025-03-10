import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import React from "react";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center">Consulta Estoque</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter Skeletons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 w-full sm:w-[300px] bg-gray-200 animate-pulse" />
              <Skeleton className="h-10 w-full sm:w-[200px] bg-gray-200 animate-pulse" />
            </div>

            {/* Table Skeleton */}
            <div className="border rounded-lg">
              {/* Header */}
              <div className="border-b">
                <div className="grid grid-cols-5 gap-4 p-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6 bg-gray-200 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Rows */}
              {[...Array(10)].map((_, i) => (
                <div key={i} className="border-b">
                  <div className="grid grid-cols-5 gap-4 p-4">
                    {[...Array(5)].map((_, j) => (
                      <Skeleton key={j} className="h-4 bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 bg-gray-200 animate-pulse" />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-[200px] bg-gray-200 animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
import { Suspense } from 'react';
import ProductSalesDetails from './[cdproduto]/page';
import ProductLoading from './[cdproduto]/loading';
import React from 'react';
export default function ProductPage() {
    return (
        <Suspense fallback={<ProductLoading />}>
            <ProductSalesDetails />
        </Suspense>
    );
} 
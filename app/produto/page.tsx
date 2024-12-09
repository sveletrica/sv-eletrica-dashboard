import { Suspense } from 'react'
import ProductSalesDetails from './[cdproduto]/page'
import ProductLoading from './[cdproduto]/loading'

export default function ProductPage() {
    return (
        <Suspense fallback={<ProductLoading />}>
            <ProductSalesDetails />
        </Suspense>
    )
} 
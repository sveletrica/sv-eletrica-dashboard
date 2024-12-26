import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { ProductImageManager } from "./product-image-manager"

interface ManageProductImagesModalProps {
    isOpen: boolean
    onClose: () => void
    productCode: string
    productName: string
    onImageUpdate?: () => void
}

export function ManageProductImagesModal({
    isOpen,
    onClose,
    productCode,
    productName,
    onImageUpdate
}: ManageProductImagesModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Gerenciar Imagens - {productName}</DialogTitle>
                </DialogHeader>
                <ProductImageManager 
                    productCode={productCode} 
                    productName={productName}
                    onImageUpdate={onImageUpdate}
                />
            </DialogContent>
        </Dialog>
    )
} 
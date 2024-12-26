import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import Image from "next/image"

interface ImagePreviewModalProps {
    isOpen: boolean
    onClose: () => void
    imageUrl: string
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="sr-only">Visualização da Imagem</DialogTitle>
                </DialogHeader>
                <div className="relative flex-1">
                    <Image
                        src={imageUrl}
                        alt="Visualização do produto"
                        fill
                        className="object-contain"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
} 
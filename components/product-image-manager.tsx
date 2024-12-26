'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Upload, Search, Plus, X, Image as ImageIcon, ChevronLeft, ChevronRight, Maximize2, Check } from 'lucide-react'
import { cn } from "@/lib/utils"
import Image from 'next/image'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface ProductImage {
    id: string
    cd_chamada: string
    imagem_url: string
    descricao: string
    ordem: number
    created_at: string
    updated_at: string
}

interface GoogleImageResult {
    url: string
    alt: string
    thumbnail?: string
    width?: number
    height?: number
}

interface ProductImageManagerProps {
    productCode: string
    productName: string
    onImageUpdate?: () => void
}

export function ProductImageManager({ productCode, productName, onImageUpdate }: ProductImageManagerProps) {
    const [images, setImages] = useState<ProductImage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchResults, setSearchResults] = useState<GoogleImageResult[]>([])
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
    const [isUploading, setIsUploading] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)

    useEffect(() => {
        fetchProductImages()
    }, [productCode])

    useEffect(() => {
        if (isSearchOpen) {
            handleGoogleSearch();
        } else {
            setSearchResults([]);
            setSelectedImages(new Set());
        }
    }, [isSearchOpen]);

    const handlePaste = useCallback(async (event: ClipboardEvent) => {
        const items = event.clipboardData?.items
        if (!items) return

        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'))
        if (!imageItem) return

        const file = imageItem.getAsFile()
        if (!file) return

        setIsUploading(true)
        try {
            const fileExt = file.type.split('/')[1] || 'jpg'
            const fileName = `${productCode}-${Date.now()}.${fileExt}`
            
            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('produtos')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('produtos')
                .getPublicUrl(fileName)

            // Save to Database
            const { error: dbError } = await supabase
                .from('produtos_imagem')
                .insert({
                    cd_chamada: productCode,
                    imagem_url: publicUrl,
                    descricao: 'Imagem colada',
                    ordem: images.length + 1
                })

            if (dbError) throw dbError

            await fetchProductImages()
            toast.success("Imagem colada com sucesso")
            onImageUpdate?.()
        } catch (error) {
            console.error('Error uploading pasted image:', error)
            toast.error("Não foi possível salvar a imagem colada")
        } finally {
            setIsUploading(false)
        }
    }, [productCode, images.length, onImageUpdate])

    useEffect(() => {
        document.addEventListener('paste', handlePaste)
        return () => {
            document.removeEventListener('paste', handlePaste)
        }
    }, [handlePaste])

    const fetchProductImages = async () => {
        try {
            const { data, error } = await supabase
                .from('produtos_imagem')
                .select('*')
                .eq('cd_chamada', productCode)
                .order('ordem')

            if (error) throw error
            setImages(data || [])
        } catch (error) {
            console.error('Error fetching images:', error)
            toast.error("Não foi possível carregar as imagens do produto")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files?.length) return

        setIsUploading(true)
        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${productCode}-${Date.now()}.${fileExt}`
                
                // Upload to Storage
                const { error: uploadError, data } = await supabase.storage
                    .from('produtos')
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('produtos')
                    .getPublicUrl(fileName)

                // Save to Database
                const { error: dbError } = await supabase
                    .from('produtos_imagem')
                    .insert({
                        cd_chamada: productCode,
                        imagem_url: publicUrl,
                        descricao: file.name,
                        ordem: images.length + 1
                    })

                if (dbError) throw dbError
            }

            await fetchProductImages()
            setIsUploadOpen(false)
            toast.success("Imagens enviadas com sucesso")
            onImageUpdate?.()
        } catch (error) {
            console.error('Error uploading:', error)
            toast.error("Não foi possível enviar as imagens")
        } finally {
            setIsUploading(false)
        }
    }

    const handleGoogleSearch = async () => {
        try {
            setSearchResults([]); // Clear previous results
            const response = await fetch(`/api/produto/google-image?query=${encodeURIComponent(productName)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.details || 'Failed to fetch images');
            }
            
            const data = await response.json();
            console.log('Search results:', data); // Debug log
            
            if (!Array.isArray(data) || data.length === 0) {
                toast.info("Nenhuma imagem encontrada para este produto");
                return;
            }
            
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching images:', error);
            toast.error("Não foi possível buscar imagens do Google");
        }
    }

    const handleImageSelect = (url: string) => {
        const newSelected = new Set(selectedImages)
        if (newSelected.has(url)) {
            newSelected.delete(url)
        } else {
            newSelected.add(url)
        }
        setSelectedImages(newSelected)
    }

    const saveSelectedImages = async () => {
        setIsUploading(true)
        let successCount = 0;
        let failureCount = 0;

        try {
            for (const url of selectedImages) {
                try {
                    // Add proxy to handle CORS
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
                    const response = await fetch(proxyUrl)
                    
                    if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || errorData.details || response.statusText)
                    }

                    const contentType = response.headers.get('Content-Type')
                    if (!contentType?.startsWith('image/')) {
                        throw new Error('Invalid content type received')
                    }

                    const blob = await response.blob()
                    if (blob.size === 0) {
                        throw new Error('Empty image received')
                    }

                    // Convert WebP to JPEG if necessary
                    let finalBlob = blob;
                    let finalContentType = contentType;
                    
                    if (contentType === 'image/webp') {
                        try {
                            // Create an image element
                            const img = new Image()
                            const blobUrl = URL.createObjectURL(blob)
                            
                            // Wait for image to load
                            await new Promise((resolve, reject) => {
                                img.onload = resolve
                                img.onerror = reject
                                img.src = blobUrl
                            })
                            
                            // Create canvas and convert to JPEG
                            const canvas = document.createElement('canvas')
                            canvas.width = img.width
                            canvas.height = img.height
                            const ctx = canvas.getContext('2d')
                            if (!ctx) throw new Error('Failed to get canvas context')
                            
                            ctx.drawImage(img, 0, 0)
                            
                            // Convert to blob
                            const jpegBlob = await new Promise<Blob>((resolve, reject) => {
                                canvas.toBlob(
                                    (blob) => {
                                        if (blob) resolve(blob)
                                        else reject(new Error('Failed to convert to JPEG'))
                                    },
                                    'image/jpeg',
                                    0.9
                                )
                            })
                            
                            // Cleanup
                            URL.revokeObjectURL(blobUrl)
                            
                            finalBlob = jpegBlob
                            finalContentType = 'image/jpeg'
                        } catch (conversionError) {
                            console.warn('WebP conversion failed:', conversionError)
                            // Fallback to original WebP if conversion fails
                        }
                    }

                    // Get extension from final content type
                    const extension = finalContentType.split('/')[1] || 'jpg'
                    const fileName = `${productCode}-${Date.now()}.${extension}`

                    // Upload to Storage
                    const { error: uploadError } = await supabase.storage
                        .from('produtos')
                        .upload(fileName, finalBlob, {
                            contentType: finalContentType
                        })

                    if (uploadError) throw uploadError

                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('produtos')
                        .getPublicUrl(fileName)

                    // Save to Database
                    const { error: dbError } = await supabase
                        .from('produtos_imagem')
                        .insert({
                            cd_chamada: productCode,
                            imagem_url: publicUrl,
                            descricao: `Google Image - ${productName}`,
                            ordem: images.length + successCount + 1
                        })

                    if (dbError) throw dbError
                    successCount++;

                } catch (imageError: any) {
                    console.error(`Failed to process image ${url}:`, imageError)
                    toast.error(`Falha ao processar imagem: ${imageError?.message || 'Erro desconhecido'}`)
                    failureCount++;
                    continue
                }
            }

            await fetchProductImages()
            setIsSearchOpen(false)
            setSelectedImages(new Set())
            
            if (successCount > 0) {
                toast.success(`${successCount} imagem(ns) salva(s) com sucesso`)
                onImageUpdate?.()
            }
            if (failureCount > 0) {
                toast.error(`${failureCount} imagem(ns) falharam ao ser processadas`)
            }
        } catch (error) {
            console.error('Error saving images:', error)
            toast.error("Erro ao salvar imagens")
        } finally {
            setIsUploading(false)
        }
    }

    const deleteImage = async (imageId: string, imageUrl: string | null) => {
        try {
            // Only try to delete from storage if we have a valid URL
            if (imageUrl) {
                const fileName = imageUrl.split('/').pop()
                if (fileName) {
                    // Try to delete from storage, but don't fail if it doesn't exist
                    try {
                        await supabase.storage
                            .from('produtos')
                            .remove([fileName])
                    } catch (storageError) {
                        console.warn('Storage delete failed:', storageError)
                        // Continue with database deletion even if storage delete fails
                    }
                }
            }

            // Always delete from database
            const { error } = await supabase
                .from('produtos_imagem')
                .delete()
                .eq('id', imageId)

            if (error) throw error

            await fetchProductImages()
            toast.success("Imagem excluída com sucesso")
        } catch (error) {
            console.error('Error deleting image:', error)
            toast.error("Não foi possível excluir a imagem")
        }
    }

    const openGallery = (index: number) => {
        setSelectedImageIndex(index)
        setIsGalleryOpen(true)
    }

    const navigateGallery = (direction: 'prev' | 'next') => {
        if (selectedImageIndex === null) return
        
        const newIndex = direction === 'prev' 
            ? (selectedImageIndex - 1 + images.length) % images.length
            : (selectedImageIndex + 1) % images.length
        
        setSelectedImageIndex(newIndex)
    }

    return (
        <Card>
            <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                {/* <CardTitle className="text-sm font-medium">Imagens do Produto</CardTitle> */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSearchOpen(true)}
                    >
                        <Search className="h-4 w-4" />
                        
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUploadOpen(true)}
                    >
                        <Upload className="h-4 w-4" />
                        
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info("Cole uma imagem usando Ctrl+V ou ⌘+V")}
                    >
                        <ImageIcon className="h-4 w-4" />
                        
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="aspect-square bg-muted animate-pulse rounded-md" />
                        ))}
                    </div>
                ) : images.length > 0 ? (
                    <div className="">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className="relative group aspect-square bg-muted rounded-md overflow-hidden"
                            >
                                {image.imagem_url ? (
                                    <>
                                        <Image
                                            src={image.imagem_url}
                                            alt={image.descricao || 'Product image'}
                                            fill
                                            className="object-contain hover:scale-105 transition-transform duration-200"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                onClick={() => openGallery(index)}
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => deleteImage(image.id, image.imagem_url)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => deleteImage(image.id, null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <p>Nenhuma imagem cadastrada</p>
                    </div>
                )}
            </CardContent>

            {/* Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload de Imagens</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg hover:bg-accent">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Clique para selecionar imagens
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                            </label>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Search Dialog */}
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Buscar Imagens</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                onClick={saveSelectedImages}
                                disabled={selectedImages.size === 0 || isUploading}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Selecionadas ({selectedImages.size})
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                            {searchResults.length > 0 ? (
                                searchResults.map((result, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "relative group cursor-pointer bg-muted rounded-md overflow-hidden",
                                            "w-full pb-[100%]",
                                            selectedImages.has(result.url) && "ring-2 ring-primary"
                                        )}
                                        onClick={() => handleImageSelect(result.url)}
                                    >
                                        <div className="absolute inset-0">
                                            <Image
                                                src={result.thumbnail || result.url}
                                                alt={result.alt}
                                                fill
                                                className="object-cover w-full h-full"
                                                unoptimized
                                                sizes="(max-width: 768px) 50vw, 33vw"
                                            />
                                            {selectedImages.has(result.url) && (
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                    <Check className="h-6 w-6 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mb-2" />
                                    <p>Nenhuma imagem encontrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Gallery Dialog */}
            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Visualização de Imagem</DialogTitle>
                    </DialogHeader>
                    {selectedImageIndex !== null && images[selectedImageIndex] && (
                        <div className="relative flex-1 min-h-0">
                            <Image
                                src={images[selectedImageIndex].imagem_url}
                                alt={images[selectedImageIndex].descricao || 'Product image'}
                                fill
                                className="object-contain"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-background/80 hover:bg-background/90"
                                    onClick={() => navigateGallery('prev')}
                                >
                                    <ChevronLeft className="h-8 w-8" />
                                </Button>
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full bg-background/80 hover:bg-background/90"
                                    onClick={() => navigateGallery('next')}
                                >
                                    <ChevronRight className="h-8 w-8" />
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-center gap-2 p-4 overflow-x-auto">
                        {images.map((image, index) => (
                            <button
                                key={image.id}
                                className={cn(
                                    "relative w-16 h-16 rounded-md overflow-hidden",
                                    selectedImageIndex === index && "ring-2 ring-primary"
                                )}
                                onClick={() => setSelectedImageIndex(index)}
                            >
                                <Image
                                    src={image.imagem_url}
                                    alt={image.descricao || 'Thumbnail'}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
} 
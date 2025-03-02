import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-4 p-4">
            {/* Search and action buttons - responsive for mobile */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Skeleton className="h-10 w-full sm:w-[300px]" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-[100px]" />
                    <Skeleton className="h-10 w-[150px]" />
                </div>
            </div>

            {/* Simulation controls - only shown when simulating */}
            <Card className="mb-6 hidden sm:block">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Discount controls */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-5 w-[180px]" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-10 flex-1" />
                                        <Skeleton className="h-10 w-[80px]" />
                                    </div>
                                </div>
                            ))}
                            
                            {/* Group discounts header */}
                            <div className="col-span-full">
                                <div className="flex items-center mb-4">
                                    <Skeleton className="h-5 w-[200px] mr-4" />
                                    <Skeleton className="h-8 w-[80px]" />
                                </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-end gap-2">
                                <Skeleton className="h-10 w-[100px]" />
                                <Skeleton className="h-10 w-[120px]" />
                                <Skeleton className="h-10 w-[100px]" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info cards - responsive grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold">
                                <Skeleton className="h-4 w-[150px]" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-4 w-[80px]" />
                                {i === 4 && (
                                    <div className="pt-2">
                                        <Skeleton className="h-8 w-[100px]" />
                                        <Skeleton className="h-10 w-[120px] mt-1" />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Products table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>
                        <Skeleton className="h-6 w-[200px]" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        {/* Table header - hidden on very small screens */}
                        <div className="hidden sm:block border-b">
                            <div className="flex p-4 gap-2">
                                <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[180px] flex-grow" />
                                <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[80px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[70px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[80px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[70px] flex-shrink-0" />
                                <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                            </div>
                        </div>

                        {/* Table rows - responsive */}
                        <div className="max-h-[500px] overflow-auto">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="p-4 border-b">
                                    {/* Mobile view - stacked layout */}
                                    <div className="block sm:hidden space-y-3">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-[80px]" />
                                            <Skeleton className="h-4 w-[60px]" />
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-[100px]" />
                                            <Skeleton className="h-4 w-[80px]" />
                                        </div>
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-[80px]" />
                                            <Skeleton className="h-4 w-[60px]" />
                                        </div>
                                    </div>

                                    {/* Desktop view - table row */}
                                    <div className="hidden sm:flex gap-2">
                                        <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[180px] flex-grow" />
                                        <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[80px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[70px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[80px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[70px] flex-shrink-0" />
                                        <Skeleton className="h-4 w-[60px] flex-shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recent quotations pagination - for the main page */}
            <div className="hidden sm:flex items-center justify-between p-4 border rounded-md">
                <Skeleton className="h-4 w-[200px]" />
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>

            {/* Bottom timer */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
                <Skeleton className="h-[60px] w-[300px] sm:w-[350px] rounded-full" />
            </div>
        </div>
    )
} 

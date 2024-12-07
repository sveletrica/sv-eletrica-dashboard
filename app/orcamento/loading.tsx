import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-[300px]" />
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[150px]" />
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <CardTitle className="text-sm font-bold">
                                <Skeleton className="h-4 w-[150px]" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[120px]" />
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-4 w-[80px]" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-6 w-[200px]" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative rounded-md border">
                        <div className="max-h-[600px] overflow-auto">
                            <div className="space-y-2">
                                <div className="flex gap-4 p-4 border-b">
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[60px]" />
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[100px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[80px]" />
                                    <Skeleton className="h-4 w-[100px]" />
                                </div>

                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="flex gap-4 p-4 border-b">
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[60px]" />
                                        <Skeleton className="h-4 w-[100px]" />
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[100px]" />
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[80px]" />
                                        <Skeleton className="h-4 w-[100px]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
                <Skeleton className="h-[60px] w-[300px] rounded-full" />
            </div>
        </div>
    )
} 

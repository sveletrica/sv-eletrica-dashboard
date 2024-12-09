import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-[200px]" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-[150px]" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-[150px]" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-[80px]" />
                            <Skeleton className="h-8 w-[80px]" />
                            <Skeleton className="h-8 w-[80px]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-6 w-[150px]" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-[80px]" />
                            <Skeleton className="h-8 w-[80px]" />
                            <Skeleton className="h-8 w-[80px]" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        </div>
    )
} 
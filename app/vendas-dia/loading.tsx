import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Loading() {
    return (
        <div className="space-y-2">
            {/* Back button skeleton */}
            <div className="w-full flex justify-end">
                <Skeleton className="h-10 w-[100px]" />
            </div>

            {/* Title skeleton */}
            <div className="flex justify-center">
                <Skeleton className="h-10 w-[250px]" />
            </div>

            {/* Cards grid */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-24" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-full mb-2" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4 mt-1" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table card */}
            <Card className="overflow-hidden">
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-6 w-32" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {[...Array(8)].map((_, i) => (
                                        <TableHead key={i}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(8)].map((_, i) => (
                                    <TableRow key={i}>
                                        {[...Array(8)].map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-4 w-full" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
} 
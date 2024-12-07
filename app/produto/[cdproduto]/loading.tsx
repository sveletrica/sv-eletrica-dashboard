"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useEffect, useState } from "react"
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export default function Loading() {
  const [mounted, setMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 1024px)")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className={cn("space-y-2", roboto.className)}>
      <div className="flex justify-end mb-0 w-full">
        <Skeleton className="h-10 w-24" />
      </div>

      <Skeleton className="h-10 w-72 mx-auto" />

      <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-2 md:p-4">
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-2 md:p-4 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <Skeleton className="h-4 w-28" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4 space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <Skeleton className="h-4 w-28" />
            </CardTitle>
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-2 md:p-4 space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      </div>

      <div className={cn(
        "grid gap-2",
        isMobile ? "grid-cols-1" : "grid-cols-2"
      )}>
        <Card>
          <CardHeader>
            <div className="h-8 flex justify-between items-center">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-5 w-32" />
              </CardTitle>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="h-8 flex justify-between items-center">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-5 w-36" />
              </CardTitle>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className={cn(
              "w-full",
              isMobile ? "h-[150px]" : "h-[300px]"
            )} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-full max-w-[800px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-full max-w-[800px]" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
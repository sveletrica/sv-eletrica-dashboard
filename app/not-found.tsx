import { Card } from "@/components/ui/card"

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md p-8 text-center space-y-4">
        <div className="text-6xl animate-bounce">
          🚧
        </div>
        <h1 className="text-2xl font-bold">
          Página ainda não implementada
        </h1>
        <p className="text-muted-foreground">
          Em breve!
        </p>
      </Card>
    </div>
  )
} 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart } from "@/components/ui/chart"

const data = [
  { name: 'Sobral', totalTagged: 400, tagsUsedTwice: 30, taggedNoStock: 20 },
  { name: 'Maracanau', totalTagged: 300, tagsUsedTwice: 25, taggedNoStock: 15 },
  { name: 'Caucaia', totalTagged: 200, tagsUsedTwice: 20, taggedNoStock: 10 },
]

const chartConfig = {
  totalTagged: { 
    label: "Total Items Tagged", 
    color: `hsl(var(--chart-1) / 1)`
  },
  tagsUsedTwice: { 
    label: "Tags Used Twice", 
    color: `hsl(var(--chart-2) / 1)`
  },
  taggedNoStock: { 
    label: "Tagged but No Stock", 
    color: `hsl(var(--chart-3) / 1)`
  },
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex justify-center">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Items in Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">2,500</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Tags in Use</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">900</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Items Without Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">150</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tag Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart data={data} config={chartConfig} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="font-semibold">SKUs with Multiple Tags</h3>
              <p className="text-2xl font-bold">45</p>
            </div>
            <div>
              <h3 className="font-semibold">Tags Used Twice</h3>
              <p className="text-2xl font-bold">75</p>
            </div>
            <div>
              <h3 className="font-semibold">Tagged but No Stock</h3>
              <p className="text-2xl font-bold">45</p>
            </div>
            <div>
              <h3 className="font-semibold">Total Items Tagged</h3>
              <p className="text-2xl font-bold">900</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
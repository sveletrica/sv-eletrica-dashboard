export const inventoryData = [
  { id: 1, sku: 'EL001', name: 'LED Bulb 9W', stock: 100, tags: 95, store: 'Sobral' },
  { id: 2, sku: 'EL002', name: 'Power Strip 5m', stock: 50, tags: 48, store: 'Maracanau' },
  { id: 3, sku: 'EL003', name: 'Extension Cord 3m', stock: 75, tags: 70, store: 'Caucaia' },
  { id: 4, sku: 'EL004', name: 'Wall Socket', stock: 200, tags: 195, store: 'Sobral' },
  { id: 5, sku: 'EL005', name: 'Circuit Breaker 10A', stock: 150, tags: 148, store: 'Maracanau' },
  { id: 6, sku: 'EL006', name: 'LED Floodlight 30W', stock: 80, tags: 78, store: 'Caucaia' },
  { id: 7, sku: 'EL007', name: 'Cable Ties (100pc)', stock: 300, tags: 290, store: 'Sobral' },
  { id: 8, sku: 'EL008', name: 'Junction Box', stock: 120, tags: 115, store: 'Maracanau' },
  { id: 9, sku: 'EL009', name: 'Electrical Tape', stock: 400, tags: 385, store: 'Caucaia' },
  { id: 10, sku: 'EL010', name: 'Wire Stripper', stock: 60, tags: 58, store: 'Sobral' },
  // ... continue with more items
].concat(
  Array.from({ length: 90 }, (_, i) => ({
    id: i + 11,
    sku: `EL${String(i + 11).padStart(3, '0')}`,
    name: `Product ${i + 11}`,
    stock: Math.floor(Math.random() * 500) + 50,
    tags: Math.floor(Math.random() * 480) + 45,
    store: ['Sobral', 'Maracanau', 'Caucaia'][Math.floor(Math.random() * 3)]
  }))
) 
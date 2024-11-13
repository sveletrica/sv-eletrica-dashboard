import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import * as LZString from 'lz-string'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add these utility functions for compression
export function compressData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    // Using LZ-string for compression
    return LZString.compress(jsonString);
  } catch (error) {
    console.error('Error compressing data:', error);
    return '';
  }
}

export function decompressData(compressed: string): any {
  try {
    const decompressed = LZString.decompress(compressed);
    return decompressed ? JSON.parse(decompressed) : null;
  } catch (error) {
    console.error('Error decompressing data:', error);
    return null;
  }
}

export function saveInChunks(key: string, data: any, chunkSize: number = 512 * 1024) {
  const stringified = JSON.stringify(data);
  const chunks = Math.ceil(stringified.length / chunkSize);
  
  // Clear any existing chunks
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('inventoryData_chunk_')) {
      localStorage.removeItem(key);
    }
  }

  // Save new chunks
  for (let i = 0; i < chunks; i++) {
    const chunk = stringified.slice(i * chunkSize, (i + 1) * chunkSize);
    localStorage.setItem(`inventoryData_chunk_${i}`, chunk);
  }
  localStorage.setItem('inventoryData_chunks', chunks.toString());
}

export function loadFromChunks(key: string): any {
  const chunks = parseInt(localStorage.getItem('inventoryData_chunks') || '0');
  if (!chunks) return null;

  let data = '';
  for (let i = 0; i < chunks; i++) {
    data += localStorage.getItem(`inventoryData_chunk_${i}`) || '';
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing chunked data:', error);
    return null;
  }
}

export async function saveToIndexedDB(data: any) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('inventoryDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('inventory', 'readwrite');
      const store = tx.objectStore('inventory');
      
      store.put(data, 'inventoryData');
      
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore('inventory');
    };
  });
}

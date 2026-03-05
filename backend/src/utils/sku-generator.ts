// backend/src/utils/sku-generator.ts
export function generateSKU(
  category: string,
  size: string,
  color: string,
  counter: number
): string {
  // Tomar primeras 3 letras de categoría
  const catPart = category.substring(0, 3).toUpperCase().padEnd(3, 'X');
  
  // Formatear talla
  const sizePart = size.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase().padEnd(2, '0');
  
  // Tomar primeras 3 letras del color
  const colorPart = color.substring(0, 3).toUpperCase().padEnd(3, 'X');
  
  // Número secuencial con padding
  const seqPart = counter.toString().padStart(4, '0');
  
  return `${catPart}${sizePart}${colorPart}${seqPart}`;
}

export function generateVariantSKU(productSKU: string, size: string, color: string): string {
  const sizeCode = size.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase().padEnd(2, '0');
  const colorCode = color.substring(0, 3).toUpperCase().padEnd(3, 'X');
  return `${productSKU}-${sizeCode}-${colorCode}`;
}
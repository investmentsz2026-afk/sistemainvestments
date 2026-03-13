"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSKU = generateSKU;
exports.generateVariantSKU = generateVariantSKU;
// backend/src/utils/sku-generator.ts
function generateSKU(category, size, color, counter) {
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
function generateVariantSKU(productSKU, size, color) {
    const sizeCode = size.replace(/[^a-zA-Z0-9]/g, '').substring(0, 2).toUpperCase().padEnd(2, '0');
    const colorCode = color.substring(0, 3).toUpperCase().padEnd(3, 'X');
    return `${productSKU}-${sizeCode}-${colorCode}`;
}

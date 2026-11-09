import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async create(user: any, data: any) {
    const { clientId, reason, evidenceUrl, items } = data;

    if (!items || items.length === 0) {
      throw new BadRequestException('La devolución debe tener al menos una prenda');
    }

    // Check if seller role
    if (!user.role.startsWith('VENDEDOR') && user.role !== 'ADMIN' && user.role !== 'COMERCIAL') {
      throw new ForbiddenException('Solo los vendedores o administradores pueden iniciar devoluciones');
    }

    // Auto-generate return number
    const count = await this.prisma.returnRequest.count();
    const returnNumber = `DEV-${(count + 1).toString().padStart(6, '0')}`;

    // Map items and calculate quantities
    const sanitizedItems = items.map((item: any) => {
      const quantity = [
        's28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46', 'size48', 'size50', 'size52'
      ].reduce((acc, field) => acc + (parseInt(item[field]) || 0), 0);

      if (quantity <= 0) {
        throw new BadRequestException(`El modelo ${item.modelName} debe tener al menos 1 unidad seleccionada`);
      }

      return {
        modelName: item.modelName.trim(),
        color: item.color.trim().toUpperCase(),
        s28: parseInt(item.s28) || 0,
        m30: parseInt(item.m30) || 0,
        l32: parseInt(item.l32) || 0,
        xl34: parseInt(item.xl34) || 0,
        xxl36: parseInt(item.xxl36) || 0,
        size38: parseInt(item.size38) || 0,
        size40: parseInt(item.size40) || 0,
        size42: parseInt(item.size42) || 0,
        size44: parseInt(item.size44) || 0,
        size46: parseInt(item.size46) || 0,
        size48: parseInt(item.size48) || 0,
        size50: parseInt(item.size50) || 0,
        size52: parseInt(item.size52) || 0,
        quantity,
      };
    });

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        returnNumber,
        clientId,
        sellerId: user.id,
        reason,
        evidenceUrl: evidenceUrl || null,
        status: 'PENDIENTE_COMERCIAL',
        items: {
          create: sanitizedItems,
        },
      },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
    });

    return returnRequest;
  }

  async findAll(user: any) {
    const where: any = {};

    // Role constraints
    if (user.role.startsWith('VENDEDOR')) {
      where.sellerId = user.id;
    } else if (user.role === 'COMERCIAL') {
      // Comercial sees all return requests to monitor them
    } else if (user.role === 'UDP') {
      // UDP only sees requests once approved by Admin and sent to quality, or final states
      where.status = {
        in: ['PENDIENTE_UDP', 'RECHAZADO_UDP', 'PENDIENTE_LOGISTICA', 'COMPLETADO']
      };
    } else if (user.role === 'LOGISTICA') {
      // Logistica only sees requests once quality approves them for inventory ingress, or completed
      where.status = {
        in: ['PENDIENTE_LOGISTICA', 'COMPLETADO']
      };
    }

    const list = await this.prisma.returnRequest.findMany({
      where,
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map(item => this.formatReturnResponse(item));
  }

  private formatReturnResponse(ret: any) {
    const invoiceMatch = ret.reason?.match(/\[Comprobante:\s*([^\]]+)\]/i);
    const invoiceNumber = invoiceMatch ? invoiceMatch[1].trim() : null;

    const ncMatch = ret.reason?.match(/\[NC:\s*([^\]]+)\]/i) || ret.qualityObservations?.match(/\[NC:\s*([^\]]+)\]/i);
    const creditNoteNumber = ncMatch ? ncMatch[1].trim() : null;

    const cleanReason = ret.reason
      ? ret.reason
          .replace(/\[Comprobante:\s*([^\]]+)\]/gi, '')
          .replace(/\[NC:\s*([^\]]+)\]/gi, '')
          .replace(/\[NC_PAYMENT_ID:\s*([^\]]+)\]/gi, '')
          .trim()
      : '';

    return {
      ...ret,
      invoiceNumber,
      creditNoteNumber,
      hasCreditNote: !!creditNoteNumber,
      inInventory: ret.status === 'COMPLETADO',
      cleanReason: cleanReason || ret.reason
    };
  }

  async findOne(id: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Devolución no encontrada');
    }

    return this.formatReturnResponse(returnRequest);
  }

  async update(id: string, user: any, data: any) {
    const returnRequest = await this.findOne(id);

    // Can not edit once fully completed into inventory
    if (returnRequest.status === 'COMPLETADO') {
      throw new BadRequestException('No se puede editar una devolución que ya completó su reingreso al inventario');
    }

    const isPrivileged = user.role === 'ADMIN' || user.role === 'COMERCIAL';
    const isOwnerRejected = returnRequest.sellerId === user.id && returnRequest.status === 'RECHAZADO_COMERCIAL';

    if (!isPrivileged && !isOwnerRejected) {
      throw new ForbiddenException('No tienes permisos para editar esta devolución');
    }

    const { clientId, reason, evidenceUrl, items } = data;

    // Map items and calculate quantities
    const sanitizedItems = items.map((item: any) => {
      const quantity = [
        's28', 'm30', 'l32', 'xl34', 'xxl36', 'size38', 'size40', 'size42', 'size44', 'size46', 'size48', 'size50', 'size52'
      ].reduce((acc, field) => acc + (parseInt(item[field]) || 0), 0);

      if (quantity <= 0) {
        throw new BadRequestException(`El modelo ${item.modelName} debe tener al menos 1 unidad seleccionada`);
      }

      return {
        modelName: item.modelName.trim(),
        color: item.color.trim().toUpperCase(),
        s28: parseInt(item.s28) || 0,
        m30: parseInt(item.m30) || 0,
        l32: parseInt(item.l32) || 0,
        xl34: parseInt(item.xl34) || 0,
        xxl36: parseInt(item.xxl36) || 0,
        size38: parseInt(item.size38) || 0,
        size40: parseInt(item.size40) || 0,
        size42: parseInt(item.size42) || 0,
        size44: parseInt(item.size44) || 0,
        size46: parseInt(item.size46) || 0,
        size48: parseInt(item.size48) || 0,
        size50: parseInt(item.size50) || 0,
        size52: parseInt(item.size52) || 0,
        quantity,
      };
    });

    // Delete old items and insert updated ones
    await this.prisma.returnRequestItem.deleteMany({
      where: { returnRequestId: id }
    });

    // Maintain current status (e.g. PENDIENTE_LOGISTICA) if privileged user edits, or reset if rejected
    const newStatus = returnRequest.status === 'RECHAZADO_COMERCIAL' ? 'PENDIENTE_COMERCIAL' : returnRequest.status;

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        clientId: clientId || returnRequest.clientId,
        reason: reason || returnRequest.reason,
        evidenceUrl: evidenceUrl !== undefined ? (evidenceUrl || null) : returnRequest.evidenceUrl,
        status: newStatus,
        rejectionReason: returnRequest.status === 'RECHAZADO_COMERCIAL' ? null : returnRequest.rejectionReason,
        items: {
          create: sanitizedItems
        }
      },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true
      }
    });

    return this.formatReturnResponse(updated);
  }

  async comercialReview(id: string, user: any, body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    if (user.role !== 'COMERCIAL' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo el rol Comercial o Admin puede revisar devoluciones de vendedores');
    }

    const returnRequest = await this.findOne(id);

    if (returnRequest.status !== 'PENDIENTE_COMERCIAL' && returnRequest.status !== 'RECHAZADO_ADMIN') {
      throw new BadRequestException('Esta devolución no está pendiente de revisión comercial');
    }

    const newStatus = body.action === 'APPROVE' ? 'PENDIENTE_ADMIN' : 'RECHAZADO_COMERCIAL';

    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: body.action === 'REJECT' ? body.rejectionReason : null,
      },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
    });
  }

  async adminReview(id: string, user: any, body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo el Administrador puede realizar esta aprobación');
    }

    const returnRequest = await this.findOne(id);

    if (returnRequest.status !== 'PENDIENTE_ADMIN' && returnRequest.status !== 'RECHAZADO_UDP') {
      throw new BadRequestException('Esta devolución no está en revisión administrativa');
    }

    const newStatus = body.action === 'APPROVE' ? 'PENDIENTE_UDP' : 'RECHAZADO_ADMIN';

    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: newStatus,
        rejectionReason: body.action === 'REJECT' ? body.rejectionReason : null,
      },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
    });
  }

  async udpReview(id: string, user: any, body: { action: 'APPROVE' | 'REJECT'; observations: string; rejectionReason?: string }) {
    if (user.role !== 'UDP' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo el personal de UDP (Calidad) o Admin puede revisar la mercadería devuelta');
    }

    const returnRequest = await this.findOne(id);

    if (returnRequest.status !== 'PENDIENTE_UDP') {
      throw new BadRequestException('Esta devolución no está en fase de revisión física en calidad');
    }

    const newStatus = body.action === 'APPROVE' ? 'PENDIENTE_LOGISTICA' : 'RECHAZADO_UDP';

    return this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: newStatus,
        qualityObservations: body.observations || null,
        rejectionReason: body.action === 'REJECT' ? body.rejectionReason : null,
      },
      include: {
        client: true,
        seller: { select: { name: true } },
        items: true,
      },
    });
  }

  async logisticsReceive(id: string, user: any) {
    if (user.role !== 'LOGISTICA' && user.role !== 'ADMIN' && user.role !== 'COMERCIAL') {
      throw new ForbiddenException('Solo el personal de Logística, Comercial o Admin puede ingresar las devoluciones al inventario');
    }

    const returnRequest = await this.findOne(id) as any;

    if (returnRequest.status !== 'PENDIENTE_LOGISTICA') {
      throw new BadRequestException('Esta devolución no está aprobada por calidad para el ingreso final');
    }

    const sizeMap: Record<string, string> = {
      s28: '28', m30: '30', l32: '32', xl34: '34', xxl36: '36',
      size38: '38', size40: '40', size42: '42', size44: '44', size46: '46', size48: '48', size50: '50', size52: '52',
    };

    const normalize = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();

    const normalizeFuzzy = (str: string) =>
      normalize(str).replace(/Y/g, 'I');

    // Process inventory ingress inside a Prisma transaction to ensure consistency
    await this.prisma.$transaction(async (tx) => {
      // Check if return is linked to an invoice (e.g. [Comprobante: F001-000082])
      let linkedSale: any = null;
      const invoiceMatch = returnRequest.reason?.match(/\[Comprobante:\s*([^\]]+)\]/i);
      const invoiceNum = invoiceMatch ? invoiceMatch[1].trim() : null;
      if (invoiceNum) {
        linkedSale = await tx.sale.findFirst({
          where: {
            OR: [
              { invoiceNumber: { equals: invoiceNum, mode: 'insensitive' } },
              { id: invoiceNum },
            ],
          },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: {
                      include: { variants: true },
                    },
                  },
                },
              },
            },
          },
        });
      }

      for (const item of returnRequest.items) {
        let product: any = null;
        const mNorm = normalize(item.modelName);
        const mFuzzy = normalizeFuzzy(item.modelName);

        // 1. Try finding matching product in linked sale items (the exact items sold)
        if (linkedSale && Array.isArray(linkedSale.items)) {
          const byExact = linkedSale.items.find((si: any) =>
            normalize(si.variant?.product?.name) === mNorm
          );
          if (byExact?.variant?.product) {
            product = byExact.variant.product;
          }

          if (!product) {
            const byFuzzy = linkedSale.items.find((si: any) =>
              normalizeFuzzy(si.variant?.product?.name) === mFuzzy
            );
            if (byFuzzy?.variant?.product) {
              product = byFuzzy.variant.product;
            }
          }

          if (!product) {
            const bySub = linkedSale.items.find((si: any) => {
              const pNorm = normalize(si.variant?.product?.name);
              return pNorm.includes(mNorm) || mNorm.includes(pNorm);
            });
            if (bySub?.variant?.product) {
              product = bySub.variant.product;
            }
          }

          if (!product && linkedSale.items.length === 1 && linkedSale.items[0]?.variant?.product) {
            product = linkedSale.items[0].variant.product;
          }
        }

        // 2. Direct exact catalog match
        if (!product) {
          product = await tx.product.findFirst({
            where: { name: { equals: item.modelName.trim(), mode: 'insensitive' } },
            include: { variants: true },
          });
        }

        // 3. Normalized / Interchangeable Y and I (e.g. FENDY <-> FENDI)
        if (!product) {
          const alt1 = item.modelName.replace(/y/gi, 'i');
          const alt2 = item.modelName.replace(/i/gi, 'y');
          product = await tx.product.findFirst({
            where: {
              OR: [
                { name: { equals: alt1.trim(), mode: 'insensitive' } },
                { name: { equals: alt2.trim(), mode: 'insensitive' } },
              ],
            },
            include: { variants: true },
          });
        }

        // 4. Contains match in catalog
        if (!product) {
          product = await tx.product.findFirst({
            where: { name: { contains: item.modelName.trim(), mode: 'insensitive' } },
            include: { variants: true },
          });
        }

        // 5. SKU match in catalog
        if (!product) {
          product = await tx.product.findFirst({
            where: { sku: { equals: item.modelName.trim(), mode: 'insensitive' } },
            include: { variants: true },
          });
        }

        // 6. Memory search across all products (fuzzy / substring)
        if (!product) {
          const allProducts = await tx.product.findMany({
            include: { variants: true },
          });
          const found = allProducts.find((p) => {
            const pFuzzy = normalizeFuzzy(p.name);
            return pFuzzy === mFuzzy || pFuzzy.includes(mFuzzy) || mFuzzy.includes(pFuzzy);
          });
          if (found) {
            product = found;
          }
        }

        // 7. Auto-create product if absent in catalog so return re-entry NEVER gets blocked
        if (!product) {
          const autoSku = `PROD-${item.modelName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'RET'}-${Date.now().toString().slice(-4)}`;
          product = await tx.product.create({
            data: {
              sku: autoSku,
              name: item.modelName.trim().toUpperCase(),
              category: 'TERMINADOS',
              purchasePrice: 0,
              sellingPrice: 0,
              minStock: 5,
              inventoryType: 'TERMINADOS',
            },
            include: { variants: true },
          });
        }

        // Check active size fields
        for (const [field, sizeValue] of Object.entries(sizeMap)) {
          const qty = (item as any)[field] || 0;
          if (qty <= 0) continue;

          // Find variant
          let variant = (product.variants || []).find((v: any) => 
            v.size.trim().toUpperCase() === sizeValue.trim().toUpperCase() &&
            v.color.trim().toUpperCase() === item.color.trim().toUpperCase()
          );

          if (!variant) {
            // Check if variant already exists in DB for this product with size & color
            variant = await tx.productVariant.findFirst({
              where: {
                productId: product.id,
                size: { equals: sizeValue, mode: 'insensitive' },
                color: { equals: item.color.trim(), mode: 'insensitive' },
              },
            });
          }

          if (!variant) {
            // Auto-create variant if it does not exist
            const baseSku = `${product.sku}-${item.color.slice(0, 3)}-${sizeValue}`.toUpperCase();
            let variantSku = baseSku;
            const existingSku = await tx.productVariant.findUnique({ where: { variantSku } });
            if (existingSku) {
              variantSku = `${baseSku}-${Date.now().toString().slice(-4)}`;
            }

            variant = await tx.productVariant.create({
              data: {
                productId: product.id,
                size: sizeValue,
                color: item.color.toUpperCase(),
                stock: 0,
                variantSku,
              },
            });
          }

          const previousStock = variant.stock;
          const newStock = previousStock + qty;

          // Update variant stock
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock },
          });

          // Create inventory entry movement log
          await tx.movement.create({
            data: {
              type: 'ENTRY',
              quantity: qty,
              reason: `Ingreso por devolución - ${returnRequest.returnNumber}`,
              reference: returnRequest.id,
              previousStock,
              newStock,
              variantId: variant.id,
              userId: user.id,
            },
          });
        }
      }

      // Finalize request state to COMPLETADO
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'COMPLETADO',
        },
      });
    });

    return this.findOne(id);
  }
}

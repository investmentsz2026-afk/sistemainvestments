import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  RegisterMovementDto,
  RegisterBulkMovementDto,
  MovementType,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "inventory_audits" (
          "id" TEXT PRIMARY KEY,
          "period" TEXT NOT NULL,
          "inventory_type" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'EN_PROCESO',
          "total_items" INTEGER NOT NULL DEFAULT 0,
          "matched_items" INTEGER NOT NULL DEFAULT 0,
          "mismatched_items" INTEGER NOT NULL DEFAULT 0,
          "total_difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "applied_adjustment" BOOLEAN NOT NULL DEFAULT FALSE,
          "notes" TEXT,
          "user_id" TEXT,
          "user_name" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "closed_at" TIMESTAMP(3)
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "inventory_audit_items" (
          "id" TEXT PRIMARY KEY,
          "audit_id" TEXT NOT NULL,
          "variant_id" TEXT NOT NULL,
          "product_id" TEXT,
          "product_name" TEXT NOT NULL,
          "variant_sku" TEXT NOT NULL,
          "size" TEXT,
          "color" TEXT,
          "location" TEXT,
          "system_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "counted_stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "is_checked" BOOLEAN NOT NULL DEFAULT FALSE,
          "observation" TEXT,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_inventory_audits_period_type" ON "inventory_audits"("period", "inventory_type");
        CREATE INDEX IF NOT EXISTS "idx_inventory_audit_items_audit" ON "inventory_audit_items"("audit_id");
      `);
    } catch (err) {
      console.error('Error creating inventory audit tables:', err);
    }
  }

  async registerMovement(
    userId: string,
    registerMovementDto: RegisterMovementDto,
  ) {
    const { variantId, type, quantity, reason, reference } =
      registerMovementDto;

    return this.prisma.$transaction(async (prisma) => {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      const previousStock = variant.stock;
      let newStock: number;

      if (type === 'ENTRY') {
        newStock = previousStock + quantity;
      } else {
        if (previousStock < quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${previousStock}, Requested: ${quantity}`,
          );
        }
        newStock = previousStock - quantity;
      }

      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      const movement = await prisma.movement.create({
        data: {
          type,
          quantity,
          reason,
          reference,
          previousStock,
          newStock,
          variantId,
          userId,
        },
        include: {
          variant: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return movement;
    });
  }

  async registerBulkMovements(
    userId: string,
    registerBulkMovementDto: RegisterBulkMovementDto,
  ) {
    const { items, type, reason, reference } = registerBulkMovementDto;

    return this.prisma.$transaction(async (prisma) => {
      // 🔥 SOLUCIÓN AL ERROR never[]
      const movements: any[] = [];

      for (const item of items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(
            `Variant ${item.variantId} not found`,
          );
        }

        const previousStock = variant.stock;
        let newStock: number;

        if (type === 'ENTRY') {
          newStock = previousStock + item.quantity;
        } else {
          if (previousStock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${variant.product.name} - ${variant.size} ${variant.color}. ` +
                `Available: ${previousStock}, Requested: ${item.quantity}`,
            );
          }
          newStock = previousStock - item.quantity;
        }

        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const movement = await prisma.movement.create({
          data: {
            type,
            quantity: item.quantity,
            reason,
            reference,
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });

        movements.push(movement);
      }

      return movements;
    });
  }

  async scanAndRegister(
    userId: string,
    variantSku: string,
    quantity: number,
    reason: string,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { variantSku },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException(
        'Product not found with this barcode',
      );
    }

    return this.registerMovement(userId, {
      variantId: variant.id,
      type: MovementType.EXIT,
      quantity,
      reason,
      reference: 'SCAN',
    });
  }

  async registerExchange(userId: string, data: any) {
    const { saleId, invoiceNumber, clientName, clientDocument, outItems, inItems, notes } = data;

    if (!outItems || !Array.isArray(outItems) || outItems.length === 0) {
      throw new BadRequestException('Debe haber al menos un producto que sale de almacén.');
    }
    if (!inItems || !Array.isArray(inItems) || inItems.length === 0) {
      throw new BadRequestException('Debe haber al menos un producto que ingresa a almacén.');
    }

    const exchangeId = `CHG-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (prisma) => {
      // 1. Process Outgoing Items (EXIT)
      const exitMovements: any[] = [];
      for (const item of outItems) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Variante a entregar (${item.variantId}) no encontrada`);
        }

        const previousStock = variant.stock;
        if (previousStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${variant.product.name} - Talla ${variant.size} Color ${variant.color}. Disponible: ${previousStock}, Solicitado: ${item.quantity}`
          );
        }

        const newStock = previousStock - item.quantity;
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const referenceData = {
          isExchange: true,
          exchangeId,
          role: 'EXIT',
          saleId: saleId || null,
          invoiceNumber: invoiceNumber || 'S/N',
          clientName: clientName || 'Cliente',
          clientDocument: clientDocument || '',
          notes: notes || 'Cambio de producto',
          outItems,
          inItems,
          createdAt: new Date().toISOString(),
        };

        const movement = await prisma.movement.create({
          data: {
            type: 'EXIT',
            quantity: item.quantity,
            reason: 'Cambio',
            reference: JSON.stringify(referenceData),
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: { include: { product: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        });
        exitMovements.push(movement);
      }

      // 2. Process Incoming Items (ENTRY)
      const entryMovements: any[] = [];
      for (const item of inItems) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Variante a recibir (${item.variantId}) no encontrada`);
        }

        const previousStock = variant.stock;
        const newStock = previousStock + item.quantity;

        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock },
        });

        const referenceData = {
          isExchange: true,
          exchangeId,
          role: 'ENTRY',
          saleId: saleId || null,
          invoiceNumber: invoiceNumber || 'S/N',
          clientName: clientName || 'Cliente',
          clientDocument: clientDocument || '',
          notes: notes || 'Cambio de producto',
          outItems,
          inItems,
          createdAt: new Date().toISOString(),
        };

        const movement = await prisma.movement.create({
          data: {
            type: 'ENTRY',
            quantity: item.quantity,
            reason: 'Cambio',
            reference: JSON.stringify(referenceData),
            previousStock,
            newStock,
            variantId: item.variantId,
            userId,
          },
          include: {
            variant: { include: { product: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        });
        entryMovements.push(movement);
      }

      return {
        success: true,
        exchangeId,
        invoiceNumber: invoiceNumber || 'S/N',
        clientName: clientName || 'Cliente',
        clientDocument: clientDocument || '',
        notes: notes || 'Cambio de producto',
        date: new Date().toISOString(),
        outItems,
        inItems,
        movements: [...exitMovements, ...entryMovements],
      };
    });
  }

  // ==========================================
  // CONTEO Y AUDITORÍA FÍSICA DE INVENTARIO
  // ==========================================

  private mapAuditRow(row: any) {
    return {
      id: row.id,
      period: row.period,
      inventoryType: row.inventory_type,
      status: row.status,
      totalItems: Number(row.total_items || 0),
      matchedItems: Number(row.matched_items || 0),
      mismatchedItems: Number(row.mismatched_items || 0),
      totalDifference: Number(row.total_difference || 0),
      appliedAdjustment: !!row.applied_adjustment,
      notes: row.notes,
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    };
  }

  private mapItemRow(row: any) {
    return {
      id: row.id,
      auditId: row.audit_id,
      variantId: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      variantSku: row.variant_sku,
      size: row.size,
      color: row.color,
      location: row.location,
      systemStock: Number(row.system_stock || 0),
      countedStock: Number(row.counted_stock || 0),
      difference: Number(row.difference || 0),
      isChecked: !!row.is_checked,
      observation: row.observation,
      updatedAt: row.updated_at,
    };
  }

  async getActiveAudit(period: string, inventoryType: string) {
    const audits = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audits" 
       WHERE "period" = $1 AND "inventory_type" = $2 AND "status" = 'EN_PROCESO' 
       ORDER BY "updated_at" DESC LIMIT 1`,
      period,
      inventoryType
    );

    if (!audits || audits.length === 0) {
      return null;
    }

    const audit = this.mapAuditRow(audits[0]);
    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audit_items" WHERE "audit_id" = $1 ORDER BY "product_name" ASC, "variant_sku" ASC`,
      audit.id
    );

    return {
      ...audit,
      items: items.map((i) => this.mapItemRow(i)),
    };
  }

  async saveAuditProgress(userId: string, data: any) {
    const { period, inventoryType, notes, items = [] } = data;
    if (!period || !inventoryType) {
      throw new BadRequestException('Periodo y tipo de inventario son requeridos');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const userName = user?.name || 'Usuario';

    let auditId = data.auditId;
    let isNew = false;

    if (auditId) {
      const existing = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "inventory_audits" WHERE "id" = $1`,
        auditId
      );
      if (!existing || existing.length === 0) {
        auditId = null;
      } else if (existing[0].status === 'CERRADO') {
        throw new BadRequestException('Esta auditoría ya se encuentra cerrada y no puede ser modificada');
      }
    }

    if (!auditId) {
      const openAudits = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "inventory_audits" WHERE "period" = $1 AND "inventory_type" = $2 AND "status" = 'EN_PROCESO' LIMIT 1`,
        period,
        inventoryType
      );
      if (openAudits && openAudits.length > 0) {
        auditId = openAudits[0].id;
      } else {
        auditId = `AUD-${Date.now().toString().slice(-8)}`;
        isNew = true;
      }
    }

    const totalItems = items.length;
    let matchedItems = 0;
    let mismatchedItems = 0;
    let totalDifference = 0;

    for (const item of items) {
      const isChecked = !!item.isChecked;
      const systemStock = Number(item.systemStock || 0);
      const countedStock = Number(item.countedStock !== undefined ? item.countedStock : systemStock);
      const diff = isChecked ? (countedStock - systemStock) : 0;

      if (isChecked) {
        if (Math.abs(diff) < 0.001) {
          matchedItems++;
        } else {
          mismatchedItems++;
          totalDifference += diff;
        }
      }
    }

    const now = new Date();

    if (isNew) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "inventory_audits" 
         ("id", "period", "inventory_type", "status", "total_items", "matched_items", "mismatched_items", "total_difference", "applied_adjustment", "notes", "user_id", "user_name", "created_at", "updated_at")
         VALUES ($1, $2, $3, 'EN_PROCESO', $4, $5, $6, $7, FALSE, $8, $9, $10, $11, $11)`,
        auditId,
        period,
        inventoryType,
        totalItems,
        matchedItems,
        mismatchedItems,
        totalDifference,
        notes || null,
        userId,
        userName,
        now
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "inventory_audits" 
         SET "total_items" = $1, "matched_items" = $2, "mismatched_items" = $3, "total_difference" = $4, "notes" = $5, "updated_at" = $6, "user_name" = $7
         WHERE "id" = $8`,
        totalItems,
        matchedItems,
        mismatchedItems,
        totalDifference,
        notes || null,
        now,
        userName,
        auditId
      );
    }

    // Refresh items
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "inventory_audit_items" WHERE "audit_id" = $1`,
      auditId
    );

    for (const item of items) {
      const itemId = `ITEM-${randomUUID().slice(0, 12)}`;
      const systemStock = Number(item.systemStock || 0);
      const countedStock = Number(item.countedStock !== undefined ? item.countedStock : systemStock);
      const difference = item.isChecked ? (countedStock - systemStock) : 0;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "inventory_audit_items" 
         ("id", "audit_id", "variant_id", "product_id", "product_name", "variant_sku", "size", "color", "location", "system_stock", "counted_stock", "difference", "is_checked", "observation", "updated_at")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        itemId,
        auditId,
        item.variantId || '',
        item.productId || null,
        item.productName || 'Producto',
        item.variantSku || '',
        item.size || null,
        item.color || null,
        item.location || 'A1',
        systemStock,
        countedStock,
        difference,
        !!item.isChecked,
        item.observation || null,
        now
      );
    }

    return this.getAuditDetails(auditId);
  }

  async finalizeAudit(userId: string, auditId: string, applyStockAdjustment: boolean, notes?: string) {
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audits" WHERE "id" = $1`,
      auditId
    );

    if (!existing || existing.length === 0) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const audit = existing[0];
    if (audit.status === 'CERRADO') {
      throw new BadRequestException('Esta auditoría ya se encuentra cerrada');
    }

    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audit_items" WHERE "audit_id" = $1`,
      auditId
    );

    const now = new Date();

    // If stock adjustment is requested in Kardex:
    if (applyStockAdjustment) {
      for (const item of items) {
        if (item.is_checked && Math.abs(Number(item.difference)) > 0.001) {
          const variant = await this.prisma.productVariant.findUnique({
            where: { id: item.variant_id },
          });

          if (variant) {
            const previousStock = variant.stock;
            const newStock = Number(item.counted_stock);
            const diff = newStock - previousStock;

            if (Math.abs(diff) > 0.001) {
              await this.prisma.productVariant.update({
                where: { id: item.variant_id },
                data: { stock: newStock },
              });

              await this.prisma.movement.create({
                data: {
                  type: diff > 0 ? 'ENTRY' : 'EXIT',
                  quantity: Math.abs(diff),
                  reason: 'Ajuste',
                  reference: JSON.stringify({
                    auditId,
                    period: audit.period,
                    type: 'AUDITORIA_CONTEO_FISICO',
                    note: item.observation || `Ajuste por conteo físico mensual (${audit.period})`,
                  }),
                  previousStock,
                  newStock,
                  variantId: item.variant_id,
                  userId,
                },
              });
            }
          }
        }
      }
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE "inventory_audits" 
       SET "status" = 'CERRADO', "applied_adjustment" = $1, "closed_at" = $2, "notes" = COALESCE($3, "notes"), "updated_at" = $2 
       WHERE "id" = $4`,
      !!applyStockAdjustment,
      now,
      notes || null,
      auditId
    );

    return this.getAuditDetails(auditId);
  }

  async getAuditsHistory(period?: string, inventoryType?: string) {
    let query = `SELECT * FROM "inventory_audits" WHERE 1=1`;
    const params: any[] = [];

    if (period && period !== 'TODOS') {
      params.push(period);
      query += ` AND "period" = $${params.length}`;
    }

    if (inventoryType && inventoryType !== 'TODOS') {
      params.push(inventoryType);
      query += ` AND "inventory_type" = $${params.length}`;
    }

    query += ` ORDER BY "created_at" DESC LIMIT 100`;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);
    return rows.map((r) => this.mapAuditRow(r));
  }

  async getAuditDetails(auditId: string) {
    const audits = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audits" WHERE "id" = $1`,
      auditId
    );

    if (!audits || audits.length === 0) {
      throw new NotFoundException('Auditoría no encontrada');
    }

    const audit = this.mapAuditRow(audits[0]);
    const items = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "inventory_audit_items" WHERE "audit_id" = $1 ORDER BY "product_name" ASC, "variant_sku" ASC`,
      auditId
    );

    return {
      ...audit,
      items: items.map((i) => this.mapItemRow(i)),
    };
  }
}
// frontend/utils/exchangeCargo.ts

export interface ExchangeCargoData {
  exchangeId: string;
  invoiceNumber: string;
  clientName: string;
  clientDocument?: string;
  date?: string | Date;
  notes?: string;
  outItems: Array<{
    productName: string;
    size?: string;
    color?: string;
    quantity: number;
    sku?: string;
    unitPrice?: number;
  }>;
  inItems: Array<{
    productName: string;
    size?: string;
    color?: string;
    quantity: number;
    sku?: string;
    unitPrice?: number;
  }>;
}

export const getExchangeCargoHTML = (data: ExchangeCargoData): string => {
  const dateObj = data.date ? new Date(data.date) : new Date();
  const formattedDate = dateObj.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalInQty = data.inItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const totalOutQty = data.outItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Cargo de Cambio - ${data.exchangeId}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #0f172a;
          padding: 30px;
          font-size: 10px;
          line-height: 1.4;
          background: #fff;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 14px;
        }

        .company-info {
          width: 58%;
        }

        .company-name {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #0f172a;
          margin-bottom: 3px;
        }

        .company-details {
          font-size: 8.5px;
          color: #475569;
          font-weight: 500;
          line-height: 1.4;
        }

        .voucher-box {
          width: 38%;
          border: 2px solid #0f172a;
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
          background: #f8fafc;
        }

        .voucher-title {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
        }

        .voucher-ruc {
          font-size: 9px;
          font-weight: 700;
          margin: 3px 0;
          color: #334155;
        }

        .voucher-number {
          font-size: 13px;
          font-weight: 900;
          color: #4f46e5;
          letter-spacing: 1px;
        }

        .voucher-date {
          font-size: 8px;
          color: #64748b;
          margin-top: 2px;
          font-weight: 600;
        }

        .section-title {
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-title span.badge {
          background: #4f46e5;
          color: white;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 8px;
        }

        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }

        .grid-info {
          display: grid;
          grid-template-columns: 130px 1fr 130px 1fr;
          gap: 6px 12px;
          font-size: 9px;
        }

        .grid-info .label {
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          font-size: 8px;
        }

        .grid-info .value {
          font-weight: 600;
          color: #0f172a;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }

        th {
          background: #0f172a;
          color: white;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 6px 8px;
          text-align: left;
        }

        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }

        td {
          padding: 6px 8px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 9px;
          color: #1e293b;
        }

        tr.in-table td {
          background: #faf5ff;
        }

        tr.out-table td {
          background: #f0fdf4;
        }

        tr.total-row td {
          font-weight: 900;
          border-top: 1.5px solid #0f172a;
          background: #f8fafc;
          font-size: 9.5px;
        }

        .declaration-box {
          border: 1px dashed #94a3b8;
          background: #f8fafc;
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 10px;
          margin-bottom: 24px;
          font-size: 8px;
          color: #475569;
          line-height: 1.4;
          font-style: italic;
        }

        .signatures {
          display: flex;
          justify-content: space-around;
          margin-top: 45px;
          page-break-inside: avoid;
        }

        .signature-box {
          width: 42%;
          text-align: center;
          border-top: 1.5px solid #0f172a;
          padding-top: 6px;
        }

        .sig-title {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
        }

        .sig-subtitle {
          font-size: 8px;
          color: #64748b;
          margin-top: 2px;
        }

        .footer {
          margin-top: 25px;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          text-align: center;
          font-size: 7.5px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media print {
          body { padding: 15px; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="company-name">INVESTMENTS Z & G S.A.</div>
          <div class="company-details">
            RUC: 20611188715<br>
            MZA. E DPTO. 201 LOTE. 11 CND. LAS PRADERAS BLOCK 18 - COMAS-LIMA-LIMA<br>
            Área de Logística y Control de Inventarios
          </div>
        </div>
        <div class="voucher-box">
          <div class="voucher-title">Acta de Cambio de Producto</div>
          <div class="voucher-ruc">R.U.C. N° 20611188715</div>
          <div class="voucher-number">${data.exchangeId}</div>
          <div class="voucher-date">Fecha: ${formattedDate} • ${formattedTime}</div>
        </div>
      </div>

      <div class="info-card">
        <div class="grid-info">
          <div class="label">Cliente / Razón Social:</div>
          <div class="value">${data.clientName || 'PÚBLICO GENERAL'}</div>
          
          <div class="label">Doc. Identidad:</div>
          <div class="value">${data.clientDocument || 'S/N'}</div>

          <div class="label">Factura de Referencia:</div>
          <div class="value" style="font-weight: 900; color: #4f46e5;">${data.invoiceNumber || 'S/N'}</div>

          <div class="label">Motivo de Cambio:</div>
          <div class="value">${data.notes || 'CAMBIO DE PRODUCTO'}</div>
        </div>
      </div>

      <!-- TABLA 1: ENTRADA A ALMACÉN (DEVUELTO POR EL CLIENTE) -->
      <div class="section-title">
        <span class="badge" style="background: #9333ea;">ENTRADA</span>
        1. Prenda(s) Devuelta(s) por el Cliente (Ingreso al Almacén)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="center">#</th>
            <th style="width: 120px;">SKU</th>
            <th>Descripción / Prenda</th>
            <th style="width: 60px;" class="center">Talla</th>
            <th style="width: 90px;" class="center">Color</th>
            <th style="width: 70px;" class="right">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${data.inItems.map((item, idx) => `
            <tr class="in-table">
              <td class="center font-bold">${idx + 1}</td>
              <td style="font-family: monospace; font-size: 8px;">${item.sku || '-'}</td>
              <td style="font-weight: 700;">${item.productName}</td>
              <td class="center font-bold">${item.size || '-'}</td>
              <td class="center">${item.color || '-'}</td>
              <td class="right" style="font-weight: 900; font-size: 10px;">${item.quantity} ud(s)</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5" class="right">TOTAL PRENDAS DEVUELTAS:</td>
            <td class="right" style="color: #9333ea;">${totalInQty} ud(s)</td>
          </tr>
        </tbody>
      </table>

      <!-- TABLA 2: SALIDA DE ALMACÉN (ENTREGADO AL CLIENTE) -->
      <div class="section-title">
        <span class="badge" style="background: #059669;">SALIDA</span>
        2. Prenda(s) Nueva(s) Entregada(s) al Cliente (Salida de Almacén)
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;" class="center">#</th>
            <th style="width: 120px;">SKU</th>
            <th>Descripción / Prenda</th>
            <th style="width: 60px;" class="center">Talla</th>
            <th style="width: 90px;" class="center">Color</th>
            <th style="width: 70px;" class="right">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          ${data.outItems.map((item, idx) => `
            <tr class="out-table">
              <td class="center font-bold">${idx + 1}</td>
              <td style="font-family: monospace; font-size: 8px;">${item.sku || '-'}</td>
              <td style="font-weight: 700;">${item.productName}</td>
              <td class="center font-bold">${item.size || '-'}</td>
              <td class="center">${item.color || '-'}</td>
              <td class="right" style="font-weight: 900; font-size: 10px; color: #059669;">${item.quantity} ud(s)</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5" class="right">TOTAL PRENDAS ENTREGADAS:</td>
            <td class="right" style="color: #059669;">${totalOutQty} ud(s)</td>
          </tr>
        </tbody>
      </table>

      <!-- DECLARACIÓN DE CONFORMIDAD -->
      <div class="declaration-box">
        <strong>DECLARACIÓN DE CONFORMIDAD:</strong> El cliente declara bajo firma haber recibido a su entera satisfacción las nuevas prendas especificadas en la sección 2 (Salida) y hacer entrega formal de la mercadería detallada en la sección 1 (Entrada) en óptimas condiciones, sin uso, limpia y con sus respectivas etiquetas.
      </div>

      <!-- SECCIÓN DE FIRMAS -->
      <div class="signatures">
        <div class="signature-box">
          <div class="sig-title">Conformidad del Cliente</div>
          <div class="sig-subtitle">Firma / DNI / Huella</div>
          <div style="margin-top: 8px; font-size: 8px; color: #475569; font-weight: 600;">
            Nombre: ${data.clientName || '_________________________'}<br>
            DNI/RUC: ${data.clientDocument || '________________________'}
          </div>
        </div>

        <div class="signature-box">
          <div class="sig-title">Responsable de Almacén / Logística</div>
          <div class="sig-subtitle">INVESTMENTS Z&G S.A.</div>
          <div style="margin-top: 8px; font-size: 8px; color: #475569; font-weight: 600;">
            Firma y Sello de Despacho / Recepción
          </div>
        </div>
      </div>

      <div class="footer">
        Este documento certifica el canje formal de mercadería en el inventario general de Investments Z&G S.A.
      </div>
    </body>
    </html>
  `;
};

export const printExchangeCargo = (data: ExchangeCargoData) => {
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (printWindow) {
    printWindow.document.write(getExchangeCargoHTML(data));
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 400);
    };
  }
};

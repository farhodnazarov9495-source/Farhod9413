import { Order } from '../types';

export function exportOrdersToExcel(orders: Order[], filenamePrefix = 'KasbiGo_Buyurtmalar'): void {
  if (!orders || orders.length === 0) {
    alert("Yuklab olish uchun buyurtmalar mavjud emas!");
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `${filenamePrefix}_${todayStr}.xls`;

  // Build clean, beautifully styled HTML table spreadsheet for Excel
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Buyurtmalar</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11pt; }
        th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #334155; padding: 10px; }
        td { border: 1px solid #CBD5E1; padding: 8px; vertical-align: middle; }
        .num { text-align: right; font-family: Consolas, monospace; }
        .center { text-align: center; }
        .status-yetkazildi { background-color: #DCFCE7; color: #166534; font-weight: bold; }
        .status-bekor { background-color: #FEE2E2; color: #991B1B; font-weight: bold; }
        .status-kuryerda { background-color: #E0E7FF; color: #3730A3; font-weight: bold; }
        .status-yangi { background-color: #FEF3C7; color: #92400E; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>KasbiGo - Buyurtmalar Hisoboti (${todayStr})</h2>
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Buyurtma ID</th>
            <th>Sana</th>
            <th>Vaqt</th>
            <th>Mijoz Ismi</th>
            <th>Mijoz Telefoni</th>
            <th>Mahalla / Manzil</th>
            <th>Do'kon / Bino</th>
            <th>Mahsulotlar Va Tafsilot</th>
            <th>Mahsulot Summasi (so'm)</th>
            <th>Yetkazish Haqi (so'm)</th>
            <th>Jami Summa (so'm)</th>
            <th>To'lov Usuli</th>
            <th>Biriktirilgan Kuryer</th>
            <th>Buyurtma Holati</th>
            <th>Usul / Turi</th>
          </tr>
        </thead>
        <tbody>
  `;

  orders.forEach((o, index) => {
    const itemsListStr = (o.items || [])
      .map(item => `${item.product?.name || 'Mahsulot'} (${item.quantity || 1} ta x ${(item.product?.price || 0).toLocaleString('uz-UZ')} so'm)`)
      .join('; ');

    const subtotal = (o.items || []).reduce((acc, item) => acc + ((item.product?.price || 0) * (item.quantity || 1)), 0);

    let statusClass = 'status-yangi';
    if (o.status === 'Yetkazildi') statusClass = 'status-yetkazildi';
    else if (o.status === 'Bekor qilindi') statusClass = 'status-bekor';
    else if (o.status === 'Kuryerda') statusClass = 'status-kuryerda';

    const orderType = o.orderMethod || ((o as any).type === 'voice' || (o as any).orderChannel === 'voice' ? 'Ovozli' :
                      (o as any).type === 'written' || (o as any).orderChannel === 'written' ? 'Yozma' : 'Savatdan');

    html += `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="center" style="mso-number-format:'\\@'; font-weight: bold;">${o.id || ''}</td>
        <td class="center">${o.date || todayStr}</td>
        <td class="center">${o.time || ''}</td>
        <td>${escapeHtml(o.customerName || 'Mijoz')}</td>
        <td class="center" style="mso-number-format:'\\@';">${escapeHtml(o.customerPhone || '')}</td>
        <td>${escapeHtml(o.address?.mahalla || 'Ko\'rsatilmagan')}</td>
        <td>${escapeHtml(o.storeName || 'KasbiGo')}</td>
        <td>${escapeHtml(itemsListStr || (o as any).customVoiceText || o.courierComment || 'Tafsilot yo\'q')}</td>
        <td class="num">${subtotal.toLocaleString('uz-UZ')}</td>
        <td class="num">${(o.deliveryFee || 0).toLocaleString('uz-UZ')}</td>
        <td class="num" style="font-weight: bold;">${(o.total || 0).toLocaleString('uz-UZ')}</td>
        <td class="center">${o.paymentMethod || 'Naqd'}</td>
        <td>${escapeHtml(o.claimedBy || 'Biriktirilmagan')}</td>
        <td class="${statusClass} center">${o.status || 'Yangi'}</td>
        <td class="center">${orderType}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

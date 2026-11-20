import type { Movement } from './finance';

/**
 * Genera y descarga un archivo CSV compatible con Microsoft Excel (con BOM UTF-8 y delimitador ;)
 */
export function exportMovementsToCSV(movements: Movement[], filename = 'Brisa-Movimientos.csv') {
  const headers = ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Valor (COP)', 'Medio / Cuenta', 'Origen'];

  const rows = movements.map((m) => {
    const kindLabel =
      m.kind === 'income' ? 'Ingreso' : m.kind === 'saving' ? 'Aporte a meta' : 'Gasto';
    const amountVal = m.kind === 'expense' ? -m.amount : m.amount;
    
    // Escapar comillas dobles y campos que contengan punto y coma o saltos de línea
    const clean = (val: string | number) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    return [
      clean(m.date),
      clean(m.description),
      clean(m.category),
      clean(kindLabel),
      clean(amountVal),
      clean(m.account),
      clean(m.source || 'Manual'),
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

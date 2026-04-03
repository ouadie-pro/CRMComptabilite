import * as XLSX from 'xlsx';

const HEADER_STYLE = {
  bold: true,
  font: { color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'center' },
};

const TITLE_STYLE = {
  bold: true,
  font: { size: 14 },
};

const RIGHT_ALIGN_STYLE = {
  alignment: { horizontal: 'right' },
};

export function formatDateFrench(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getFrenchDateFilename() {
  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                   'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  const d = new Date();
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function applyHeaderStyle(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || `A1:A1`);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = HEADER_STYLE;
  }
}

export function exportToExcel(data, columns, filename, sheetName = 'Data', rightAlignCols = []) {
  const ws = XLSX.utils.json_to_sheet(
    data.map(row => {
      const mapped = {};
      columns.forEach(col => {
        const value = col.value(row);
        if (col.textType) {
          mapped[col.header] = { t: 's', v: String(value ?? '') };
        } else {
          mapped[col.header] = value;
        }
      });
      return mapped;
    })
  );

  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  rightAlignCols.forEach(colIndex => {
    const range = XLSX.utils.decode_range(ws['!ref'] || `A1:A1`);
    for (let R = range.s.r; R <= range.e.r; R++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: colIndex });
      if (!ws[addr]) continue;
      ws[addr].s = { ...ws[addr].s, ...RIGHT_ALIGN_STYLE };
    }
  });

  applyHeaderStyle(ws);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  XLSX.writeFile(wb, filename);
}

export function exportMultiSheetExcel(sheets, filename, summaryData = null) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, columns, data, rightAlignCols = [] }) => {
    if (name === 'Résumé' && !columns.length) {
      const ws = XLSX.utils.aoa_to_sheet([
        [{ v: 'Sauvegarde CRM Comptabilité', s: TITLE_STYLE }],
        [{ v: `Date: ${getFrenchDateFilename()}`, s: {} }],
        [],
        [{ v: 'Entité', s: HEADER_STYLE }, { v: "Nombre d'enregistrements", s: HEADER_STYLE }],
        [{ v: 'Clients', s: {} }, { v: summaryData?.clients || 0, t: 'n' }],
        [{ v: 'Factures', s: {} }, { v: summaryData?.invoices || 0, t: 'n' }],
        [{ v: 'Produits', s: {} }, { v: summaryData?.products || 0, t: 'n' }],
        [{ v: 'Dépenses', s: {} }, { v: summaryData?.expenses || 0, t: 'n' }],
      ]);
      ws['!cols'] = [{ wch: 30 }, { wch: 25 }];
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      applyHeaderStyle(ws);
      XLSX.utils.book_append_sheet(wb, ws, name);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      data.map(row => {
        const mapped = {};
        columns.forEach(col => {
          const value = col.value(row);
          if (col.textType) {
            mapped[col.header] = { t: 's', v: String(value ?? '') };
          } else {
            mapped[col.header] = value;
          }
        });
        return mapped;
      })
    );

    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

    rightAlignCols.forEach(colIndex => {
      const range = XLSX.utils.decode_range(ws['!ref'] || `A1:A1`);
      for (let R = range.s.r; R <= range.e.r; R++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: colIndex });
        if (!ws[addr]) continue;
        ws[addr].s = { ...ws[addr].s, ...RIGHT_ALIGN_STYLE };
      }
    });

    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    applyHeaderStyle(ws);

    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  XLSX.writeFile(wb, filename);
}

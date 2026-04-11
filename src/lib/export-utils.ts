import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Common export utility for StarMart
 */
export const exportData = {
  /**
   * Export to CSV
   */
  toCSV: <T extends object>(data: T[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export to Excel
   */
  toExcel: <T extends object>(data: T[], filename: string, sheetName: string = 'Sheet1') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  },

  /**
   * Export to PDF
   */
  toPDF: <T extends object>(data: T[], filename: string, title: string) => {
    const doc = new jsPDF();
    const headers = Object.keys(data[0] || {}).map(k => k.toUpperCase());
    const body = data.map(row => Object.values(row).map(v => String(v ?? '')));

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: [headers],
      body: body as string[][], 
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
    });
    doc.save(`${filename}.pdf`);
  },

  /**
   * Export to TXT (Tab Separated)
   */
  toTXT: <T extends object>(data: T[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]) as (keyof T)[];
    const lines = [
      headers.join('\t'),
      ...data.map(row => headers.map(h => row[h]).join('\t'))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

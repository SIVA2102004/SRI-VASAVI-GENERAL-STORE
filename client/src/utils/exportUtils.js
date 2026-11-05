import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Currency Formatter
export function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format Date
export function formatDate(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

// Transaction type badge styling
export function getTypeBadge(type) {
  switch (type) {
    case 'Amount Received':
    case 'Loan Received':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        sign: '+'
      };
    case 'Amount Given':
    case 'Loan Given':
    case 'Expense':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
        dot: 'bg-rose-500',
        sign: '-'
      };
    default:
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
        dot: 'bg-blue-500',
        sign: ''
      };
  }
}

// Export array of transactions to Excel
export function exportToExcel(transactions, filename = 'DayBook_Transactions.xlsx') {
  const rows = transactions.map((t, idx) => ({
    'S.No': idx + 1,
    'Date': formatDate(t.transaction_date),
    'Person Name': t.person_name || 'N/A',
    'Mobile': t.mobile_number || '-',
    'Type': t.transaction_type,
    'Amount (₹)': t.amount,
    'Payment Mode': t.payment_mode,
    'Purpose / Description': t.description || '-',
    'Notes': t.notes || '-',
    'Reference No.': t.reference_number || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  XLSX.writeFile(workbook, filename);
}

// Export array of transactions to CSV
export function exportToCSV(transactions, filename = 'DayBook_Transactions.csv') {
  const headers = ['S.No', 'Date', 'Person Name', 'Mobile', 'Type', 'Amount (INR)', 'Payment Mode', 'Purpose', 'Notes', 'Reference'];
  const rows = transactions.map((t, idx) => [
    idx + 1,
    formatDate(t.transaction_date),
    `"${(t.person_name || '').replace(/"/g, '""')}"`,
    `"${t.mobile_number || ''}"`,
    `"${t.transaction_type}"`,
    t.amount,
    `"${t.payment_mode}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    `"${t.reference_number || ''}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate PDF Report using jsPDF & autoTable
export function exportToPDF(transactions, title = 'Personal Digital Day Book - Statement', subtitle = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Title & Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  if (subtitle) {
    doc.text(subtitle, 14, 26);
  }
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, subtitle ? 32 : 26);

  // Summary Metrics inside PDF
  let totalGiven = 0;
  let totalReceived = 0;
  let totalExpense = 0;

  transactions.forEach(t => {
    if (t.transaction_type === 'Amount Given' || t.transaction_type === 'Loan Given') totalGiven += t.amount;
    if (t.transaction_type === 'Amount Received' || t.transaction_type === 'Loan Received') totalReceived += t.amount;
    if (t.transaction_type === 'Expense') totalExpense += t.amount;
  });

  const net = totalGiven - totalReceived;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, subtitle ? 36 : 30, 182, 16, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const metricY = subtitle ? 46 : 40;
  doc.text(`Given: Rs.${totalGiven.toFixed(2)}`, 20, metricY);
  doc.text(`Received: Rs.${totalReceived.toFixed(2)}`, 68, metricY);
  doc.text(`Expense: Rs.${totalExpense.toFixed(2)}`, 116, metricY);
  doc.text(`Net Balance: Rs.${net.toFixed(2)}`, 160, metricY);

  const startY = subtitle ? 58 : 52;

  const tableData = transactions.map((t, idx) => [
    idx + 1,
    formatDate(t.transaction_date),
    t.person_name || '-',
    t.transaction_type,
    `Rs. ${Number(t.amount).toLocaleString('en-IN')}`,
    t.payment_mode,
    t.description || '-'
  ]);

  autoTable(doc, {
    startY: startY,
    head: [['#', 'Date', 'Person Name', 'Type', 'Amount', 'Mode', 'Description']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 20 },
      6: { cellWidth: 'auto' }
    }
  });

  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

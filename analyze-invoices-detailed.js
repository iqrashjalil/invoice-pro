const XLSX = require('xlsx');

// Read individual invoice files
const invoiceFiles = ['testing-files/inv_487.xlsx', 'testing-files/inv_489.xlsx'];

invoiceFiles.forEach(filePath => {
  console.log('\n\n=================================================');
  console.log(`ANALYZING: ${filePath}`);
  console.log('=================================================\n');
  
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets['3rd'];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  console.log('Looking for totals section (rows 40-71):');
  for (let i = 40; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowStr = row.join(' | ');
    if (rowStr.trim().length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  }
});

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read and analyze all Excel files
const files = [
  'testing-files/inv_487.xlsx',
  'testing-files/inv_489.xlsx',
  'testing-files/Zubaida Sale Report 1025.xlsx'
];

files.forEach(filePath => {
  console.log('\n\n=================================================');
  console.log(`ANALYZING: ${filePath}`);
  console.log('=================================================\n');
  
  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log('Sheet Names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n--- Sheet: ${sheetName} ---`);
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      console.log(`Total rows: ${jsonData.length}`);
      console.log('\nFirst 20 rows:');
      jsonData.slice(0, 20).forEach((row, idx) => {
        console.log(`Row ${idx}:`, JSON.stringify(row));
      });
    });
  } catch (error) {
    console.error('Error reading file:', error.message);
  }
});

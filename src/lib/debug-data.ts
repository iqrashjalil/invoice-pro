// Debug component to test parsing logic with sample data
// This file can be used to test the parsing logic with the exact structure from your sample

export const debugSampleData = () => {
  // This represents the structure from your sample data
  const sampleStructure = [
    ["", "", "Mumtaz Brothers"],
    ["", "", "Sale Report - Langnese"], 
    ["", "", "Invoice No", "Date", "NTN", "Name", "Quantity", "Quantity-A", "Exclusive", "Sales tax", "%", "Code"],
    ["", "", "483", "28/Oct/25", "4269497-3", "ZUBAIDA ASSOCIATES", "30", "- 0", "23,135.59", "4,164.41", "18.00", "1517.9000"],
    ["", "", "484", "28/Oct/25", "4269497-3", "ZUBAIDA ASSOCIATES", "32", "- 0", "23,474.58", "4,225.42", "18.00", "1517.9000"]
  ];

  console.log("Sample structure for testing:", sampleStructure);
  
  // Test the header detection logic
  for (let i = 0; i < sampleStructure.length; i++) {
    const row = sampleStructure[i];
    const stringRow = row.map(cell => String(cell || "").toLowerCase().trim());
    
    const hasInvoiceHeader = stringRow.some(cell => 
      cell.includes("invoice") || cell.includes("invoice no")
    );
    
    const hasCommonHeaders = stringRow.some(cell => 
      cell.includes("date") || cell.includes("ntn") || cell.includes("name")
    );
    
    console.log(`Row ${i}:`, row, "hasInvoiceHeader:", hasInvoiceHeader, "hasCommonHeaders:", hasCommonHeaders);
    
    if (hasInvoiceHeader || hasCommonHeaders) {
      console.log("Found header row at index:", i);
      const headers = row.map(cell => String(cell || "").replace(/\*/g, "").trim());
      console.log("Cleaned headers:", headers);
      break;
    }
  }
};

// Export this to be used in the main component for debugging
export default debugSampleData;
"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Upload, FileText, Download, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvoiceData {
  invoiceNo: string;
  date: string;
  ntn: string;
  name: string;
  quantity: number;
  quantityA: number;
  exclusive: number;
  salesTax: number;
  percentage: number;
  code: string;
}

interface ProcessedFile {
  name: string;
  data: InvoiceData[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface AggregatedReport {
  invoices: InvoiceData[];
  totalInvoices: number;
  totalAmount: number;
  totalTax: number;
}

export default function InvoiceProcessor() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aggregatedReport, setAggregatedReport] = useState<AggregatedReport | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode

  const parseInvoiceFile = async (file: File): Promise<InvoiceData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Try to find the right sheet - first look for "Sheet1" or use the first sheet
          let worksheetName = workbook.SheetNames[0];
          if (workbook.SheetNames.includes("Sheet1")) {
            worksheetName = "Sheet1";
          } else if (workbook.SheetNames.includes("3rd")) {
            worksheetName = "3rd"; // For individual invoice files
          }
          
          const worksheet = workbook.Sheets[worksheetName];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log("Raw data from Excel:", jsonData.slice(0, 15)); // Debug log
          
          // Check if this is an individual invoice file or consolidated report
          const isIndividualInvoice = checkIfIndividualInvoice(jsonData);
          console.log("Is individual invoice file:", isIndividualInvoice);
          
          let invoiceData: InvoiceData[] = [];
          
          if (isIndividualInvoice) {
            invoiceData = parseIndividualInvoice(jsonData);
          } else {
            invoiceData = parseConsolidatedReport(jsonData);
          }
          
          console.log("Total invoices found:", invoiceData.length);
          
          if (invoiceData.length === 0) {
            console.log("No invoice data found. Sample rows:", jsonData.slice(0, 15));
            throw new Error("No valid invoice data found in the file");
          }
          
          resolve(invoiceData);
        } catch (error) {
          console.error("Parsing error:", error);
          reject(new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  };

  const checkIfIndividualInvoice = (jsonData: any[][]): boolean => {
    // Look for patterns that indicate individual invoice format
    const dataString = JSON.stringify(jsonData).toLowerCase();
    return dataString.includes("sales tax invoice") || 
           dataString.includes("product barcode") ||
           dataString.includes("to") && dataString.includes("from");
  };

  const parseIndividualInvoice = (jsonData: any[][]): InvoiceData[] => {
    console.log("Parsing individual invoice file...");
    
    // Extract invoice details from specific row positions based on the invoice template
    let invoiceNo = "";
    let invoiceDate = "";
    let customerName = "";
    let ntn = "";
    let totalQuantity = 0;
    let totalExclusive = 0;
    let totalTax = 0;
    
    // Row 8: Invoice number (e.g., "invoice #487")
    if (jsonData.length > 8 && jsonData[8]) {
      const row8 = jsonData[8];
      for (const cell of row8) {
        const cellStr = String(cell || "").toLowerCase();
        if (cellStr.includes("invoice #")) {
          invoiceNo = String(cell).replace(/[^0-9]/g, '');
          console.log("Found invoice number at row 8:", invoiceNo);
          break;
        }
      }
    }
    
    // Row 6: Date (e.g., "DATE:30-10-25")
    if (jsonData.length > 6 && jsonData[6]) {
      const row6 = jsonData[6];
      for (const cell of row6) {
        const cellStr = String(cell || "");
        if (cellStr.includes("DATE:")) {
          invoiceDate = cellStr.replace(/.*DATE:/gi, '').trim();
          console.log("Found date at row 6:", invoiceDate);
          break;
        }
      }
    }
    
    // Row 4: Customer name (e.g., "ZUBAIDA ASSOCIATES")
    if (jsonData.length > 4 && jsonData[4]) {
      const row4 = jsonData[4];
      for (const cell of row4) {
        const cellStr = String(cell || "").toUpperCase();
        if (cellStr.includes("ZUBAIDA")) {
          customerName = "ZUBAIDA ASSOCIATES";
          console.log("Found customer name at row 4:", customerName);
          break;
        }
      }
    }
    
    // Row 5: NTN (e.g., "NTN: 4269497-3")
    if (jsonData.length > 5 && jsonData[5]) {
      const row5 = jsonData[5];
      for (const cell of row5) {
        const cellStr = String(cell || "");
        if (cellStr.includes("NTN:") && cellStr.includes("4269497")) {
          ntn = cellStr.replace(/.*NTN:\s*/gi, '').trim();
          console.log("Found NTN at row 5:", ntn);
          break;
        }
      }
    }
    
    // Find TOTAL row (around row 65) - extract quantity from column 5
    for (let i = 60; i < Math.min(jsonData.length, 70); i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const rowString = row.map(cell => String(cell || "")).join(" ").toUpperCase();
      
      if (rowString.includes("TOTAL") && !rowString.includes("GST") && !rowString.includes("GROSS") && !rowString.includes("NET")) {
        console.log(`Found TOTAL row at ${i}:`, row);
        
        // Column 5 (index 5) contains the total quantity
        if (row[5] !== undefined && row[5] !== null && row[5] !== "") {
          totalQuantity = parseInt(String(row[5]));
          console.log("Extracted quantity from column 5:", totalQuantity);
        }
        
        // Column 9 contains exclusive amount (EXCUSIVE(GST))
        if (row[9] !== undefined && row[9] !== null && row[9] !== "") {
          const exclusiveValue = String(row[9]).replace(/[^0-9.-]/g, '');
          totalExclusive = parseFloat(exclusiveValue);
          console.log("Extracted exclusive from column 9:", totalExclusive);
        }
        
        // Column 10 contains sales tax (GST(18%))
        if (row[10] !== undefined && row[10] !== null && row[10] !== "") {
          const taxValue = String(row[10]).replace(/[^0-9.-]/g, '');
          totalTax = parseFloat(taxValue);
          console.log("Extracted tax from column 10:", totalTax);
        }
        
        break;
      }
    }
    
    // Fallback: Look for "Gross Amount" row (around row 66) - column 11
    if (totalExclusive === 0) {
      for (let i = 60; i < Math.min(jsonData.length, 70); i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        
        const rowString = row.map(cell => String(cell || "")).join(" ").toUpperCase();
        
        if (rowString.includes("GROSS AMOUNT")) {
          console.log(`Found Gross Amount row at ${i}:`, row);
          
          // Column 11 contains the gross amount
          if (row[11] !== undefined && row[11] !== null && row[11] !== "") {
            const exclusiveValue = String(row[11]).replace(/[^0-9.-]/g, '');
            totalExclusive = parseFloat(exclusiveValue);
            console.log("Extracted exclusive from Gross Amount (column 11):", totalExclusive);
          }
        }
        
        // Look for "Gst @ 18%" row (around row 67) - column 11
        if (rowString.includes("GST") && rowString.includes("18%")) {
          console.log(`Found GST row at ${i}:`, row);
          
          // Column 11 contains the tax amount
          if (row[11] !== undefined && row[11] !== null && row[11] !== "") {
            const taxValue = String(row[11]).replace(/[^0-9.-]/g, '');
            totalTax = parseFloat(taxValue);
            console.log("Extracted tax from GST row (column 11):", totalTax);
          }
        }
      }
    }
    
    // Create a single invoice record from the individual invoice
    const invoice: InvoiceData = {
      invoiceNo: invoiceNo || "UNKNOWN",
      date: invoiceDate || "UNKNOWN",
      ntn: ntn || "4269497-3",
      name: customerName || "ZUBAIDA ASSOCIATES",
      quantity: totalQuantity,
      quantityA: 0,
      exclusive: totalExclusive,
      salesTax: totalTax,
      percentage: totalExclusive > 0 ? ((totalTax / totalExclusive) * 100) : 18,
      code: "1517.9000"
    };
    
    console.log("Final parsed individual invoice:", invoice);
    return [invoice];
  };

  const parseConsolidatedReport = (jsonData: any[][]): InvoiceData[] => {
    console.log("Parsing consolidated report...");
    
    // Find the header row - look for any row containing "Invoice" or "Invoice No"
    let headerRowIndex = -1;
    let headers: string[] = [];
    
    console.log("Searching for headers in", jsonData.length, "rows");
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const rowString = row.map(cell => String(cell || "")).join(" | ");
      console.log(`Row ${i}:`, rowString);
      
      // Convert all cells to strings and check for header indicators
      const stringRow = row.map(cell => String(cell || "").toLowerCase().trim());
      
      // Look for rows that contain invoice-related headers
      const hasInvoiceHeader = stringRow.some(cell => 
        cell && (cell.includes("invoice") || cell.includes("invoice no"))
      );
      
      // Also check for common header patterns in the sample data
      const hasCommonHeaders = stringRow.some(cell => 
        cell && (cell.includes("date") || cell.includes("ntn") || cell.includes("name"))
      );
      
      if (hasInvoiceHeader || hasCommonHeaders) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell || ""));
        console.log("Found header row at index:", i, headers);
        break;
      }
    }
    
    // If still not found, try a more flexible approach
    if (headerRowIndex === -1) {
      console.log("Trying alternative header detection...");
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length < 5) continue;
        
        // Check if this looks like a data row with invoice-like content
        const firstCell = String(row[0] || "");
        const secondCell = String(row[1] || "");
        
        console.log(`Checking row ${i} for data pattern:`, firstCell, secondCell);
        
        // Check if first cell looks like an invoice number (digits)
        if (/^\d+$/.test(firstCell) && secondCell.includes("/")) {
          // This might be a data row, so assume the previous row was headers
          if (i > 0) {
            headerRowIndex = i - 1;
            headers = jsonData[i - 1].map((cell: any) => String(cell || ""));
            console.log("Found header using data pattern at index:", headerRowIndex, headers);
            break;
          }
        }
      }
    }
    
    // Absolute fallback - assume the first non-empty row with enough columns is headers
    if (headerRowIndex === -1 && jsonData.length > 1) {
      console.log("Using absolute fallback for header detection...");
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] as any[];
        if (row && row.length >= 8) {
          headerRowIndex = i;
          headers = row.map((cell: any, index: number) => 
            String(cell || `Column${index + 1}`)
          );
          console.log("Using fallback header at index:", headerRowIndex, headers);
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      console.log("Available data:", jsonData);
      throw new Error("Could not find invoice data header row. Available sheets: ");
    }
    
    // Clean up headers - remove asterisks and extra spaces
    headers = headers.map(header => 
      String(header || "").replace(/\*/g, "").trim()
    );
    
    console.log("Cleaned headers:", headers);
    
    const invoiceData: InvoiceData[] = [];
    
    // Process data rows starting from the row after headers
    console.log("Processing data rows starting from index", headerRowIndex + 1);
    
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      const rowString = row.map(cell => String(cell || "")).join(" | ");
      console.log(`Processing row ${i}:`, rowString);
      
      // Skip rows that are clearly not invoice data
      const firstCell = String(row[0] || "").trim();
      
      if (firstCell === "*" || firstCell === "TOTAL" || firstCell === "Gross Amount" || firstCell === "") {
        console.log("Skipping row", i, "- not invoice data");
        continue;
      }
      
      // Try to extract data using multiple approaches
      let invoice: InvoiceData = {
        invoiceNo: "",
        date: "",
        ntn: "",
        name: "",
        quantity: 0,
        quantityA: 0,
        exclusive: 0,
        salesTax: 0,
        percentage: 0,
        code: ""
      };
      
      // Method 1: Use headers to map columns
      if (headers.length > 0) {
        console.log("Using header-based mapping");
        invoice = {
          invoiceNo: String(row[headers.findIndex(h => h && h.toLowerCase().includes("invoice"))] || row[0] || ""),
          date: String(row[headers.findIndex(h => h && h.toLowerCase().includes("date"))] || row[1] || ""),
          ntn: String(row[headers.findIndex(h => h && h.toLowerCase().includes("ntn"))] || row[2] || ""),
          name: String(row[headers.findIndex(h => h && h.toLowerCase().includes("name"))] || row[3] || ""),
          quantity: Number(row[headers.findIndex(h => h && h.toLowerCase().includes("quantity"))] || row[4] || 0),
          quantityA: Number(String(row[headers.findIndex(h => h && h.toLowerCase().includes("quantity-a"))] || row[5] || "0").replace(/[^0-9.-]/g, '')),
          exclusive: Number(String(row[headers.findIndex(h => h && h.toLowerCase().includes("exclusive"))] || row[6] || "0").replace(/[^0-9.-]/g, '')),
          salesTax: Number(String(row[headers.findIndex(h => h && h.toLowerCase().includes("sales"))] || row[7] || "0").replace(/[^0-9.-]/g, '')),
          percentage: Number(row[headers.findIndex(h => h && h.includes("%"))] || row[8] || 0),
          code: String(row[headers.findIndex(h => h && h.toLowerCase().includes("code"))] || row[9] || "")
        };
      }
      
      // Method 2: If header mapping fails, use positional mapping
      if (!invoice.invoiceNo && row.length >= 8) {
        console.log("Using positional mapping");
        invoice = {
          invoiceNo: String(row[0] || ""),
          date: String(row[1] || ""),
          ntn: String(row[2] || ""),
          name: String(row[3] || ""),
          quantity: Number(row[4] || 0),
          quantityA: Number(String(row[5] || "0").replace(/[^0-9.-]/g, '')),
          exclusive: Number(String(row[6] || "0").replace(/[^0-9.-]/g, '')),
          salesTax: Number(String(row[7] || "0").replace(/[^0-9.-]/g, '')),
          percentage: Number(row[8] || 0),
          code: String(row[9] || "")
        };
      }
      
      console.log("Extracted invoice:", invoice);
      
      // Only add if we have meaningful data
      if (invoice.invoiceNo && invoice.date && (invoice.exclusive > 0 || invoice.quantity > 0)) {
        invoiceData.push(invoice);
        console.log("Added invoice to results:", invoice);
      } else {
        console.log("Skipping invoice - missing required data:", invoice);
      }
    }
    
    console.log("Final invoice data from consolidated report:", invoiceData);
    return invoiceData;
  };

  const processFiles = async (uploadedFiles: File[]) => {
    setIsProcessing(true);
    const processedFiles: ProcessedFile[] = uploadedFiles.map(file => ({
      name: file.name,
      data: [],
      status: 'pending' as const
    }));
    
    setFiles(processedFiles);
    
    try {
      // Store the processed data in a temporary array
      const allProcessedData: InvoiceData[] = [];
      
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'processing' } : f
        ));
        
        try {
          const data = await parseInvoiceFile(file);
          allProcessedData.push(...data); // Add to our temporary array
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'completed', data } : f
          ));
        } catch (error) {
          setFiles(prev => prev.map((f, idx) => 
            idx === i ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Unknown error'
            } : f
          ));
        }
      }
      
      // Generate aggregated report after all files are processed using the collected data
      const totalAmount = allProcessedData.reduce((sum, inv) => sum + inv.exclusive, 0);
      const totalTax = allProcessedData.reduce((sum, inv) => sum + inv.salesTax, 0);
      
      console.log("All processed invoice data:", allProcessedData);
      console.log("Total invoices:", allProcessedData.length);
      
      setAggregatedReport({
        invoices: allProcessedData,
        totalInvoices: allProcessedData.length,
        totalAmount,
        totalTax
      });
      
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const excelFiles = acceptedFiles.filter(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (excelFiles.length === 0) {
      alert("Please upload only Excel files (.xlsx or .xls)");
      return;
    }
    
    processFiles(excelFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const generateReport = () => {
    if (!aggregatedReport) return;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare data for the report in the same format as the sample
    const reportData: any[][] = [
      ["", "", "Mumtaz Brothers"],
      ["", "", "Sale Report - Langnese"],
      ["Invoice No", "Date", "NTN", "Name", "Quantity", "Quantity-A", "Exclusive", "Sales tax", "%", "Code"]
    ];
    
    // Add all invoice data
    aggregatedReport.invoices.forEach((invoice, index) => {
      reportData.push([
        invoice.invoiceNo,
        invoice.date,
        invoice.ntn,
        invoice.name,
        Number(invoice.quantity),
        Number(invoice.quantityA),
        Number(invoice.exclusive),
        Number(invoice.salesTax),
        Number(invoice.percentage),
        invoice.code
      ]);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(reportData);
    
    // Set column widths
    const colWidths = [
      { wch: 10 }, // Invoice No
      { wch: 12 }, // Date
      { wch: 15 }, // NTN
      { wch: 20 }, // Name
      { wch: 10 }, // Quantity
      { wch: 12 }, // Quantity-A
      { wch: 15 }, // Exclusive
      { wch: 12 }, // Sales tax
      { wch: 8 },  // %
      { wch: 15 }  // Code
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download the file
    const fileName = `Consolidated_Invoice_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  };

  const clearFiles = () => {
    setFiles([]);
    setAggregatedReport(null);
  };

  const getStatusIcon = (status: ProcessedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Invoice Processor</h1>
          <p className="text-slate-600">Upload multiple Excel invoice files to generate a consolidated report</p>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Invoice Files
            </CardTitle>
            <CardDescription>
              Select or drag and drop multiple Excel files (.xlsx, .xls)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-slate-600 mb-2">
                    Drag & drop Excel files here, or click to select files
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports .xlsx and .xls formats
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* File Processing Status */}
        {files.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Processed Files
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFiles}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="font-medium text-slate-900">{file.name}</p>
                        {file.status === 'completed' && (
                          <p className="text-sm text-slate-600">
                            {file.data.length} invoices found
                          </p>
                        )}
                        {file.status === 'error' && (
                          <p className="text-sm text-red-600">{file.error}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      file.status === 'completed' ? 'default' :
                      file.status === 'error' ? 'destructive' :
                      file.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {file.status}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {isProcessing && (
                <div className="mt-4">
                  <Progress value={undefined} className="h-2" />
                  <p className="text-sm text-slate-600 mt-2">Processing files...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Report Summary */}
        {aggregatedReport && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
              <CardDescription>
                Consolidated data from all processed invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Invoices</p>
                  <p className="text-2xl font-bold text-blue-900">{aggregatedReport.totalInvoices}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Amount (Exclusive)</p>
                  <p className="text-2xl font-bold text-green-900">
                    {aggregatedReport.totalAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Total Tax</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {aggregatedReport.totalTax.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={generateReport}
                className="w-full"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Combined Report
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions:</strong> Upload multiple Excel invoice files containing invoice data with columns like Invoice No, Date, NTN, Name, Quantity, etc. 
            The system will automatically parse the files and generate a consolidated report in the same format as the sample report.
          </AlertDescription>
        </Alert>

        {/* Debug Panel */}
        {debugMode && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Debug Mode Active:</strong> Check the browser console (F12) for detailed parsing information. 
              This will help identify any issues with your Excel file structure.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
# Invoice Processor

A Next.js web application that allows users to upload multiple Excel invoice files and generate a consolidated report entirely in the browser.

## Features

- **Multiple File Upload**: Upload multiple Excel files at once using drag-and-drop or file selection
- **Dual Format Support**: Handles both individual invoice files and consolidated reports
- **Smart Invoice Parsing**: Automatically detects and extracts invoice data from different Excel formats
- **Real-time Status Updates**: See the processing status of each file
- **Report Summary**: View aggregated statistics before downloading
- **Excel Export**: Generate and download a consolidated Excel report

## Supported File Formats

### Individual Invoice Files (e.g., inv_489.xlsx, inv_487.xlsx)
- Contains "SALES TAX INVOICE" headers
- Has customer information (TO/FROM sections)
- Includes product tables with totals
- Automatically extracts invoice number, date, totals, and customer info

### Consolidated Reports (e.g., Zubaida Sale Report 1025.xlsx)
- Contains multiple invoices in tabular format
- Has headers like "Invoice No", "Date", "NTN", "Name", etc.
- Processes each row as a separate invoice

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** components for UI
- **SheetJS (xlsx)** for Excel file processing
- **react-dropzone** for drag-and-drop functionality
- **file-saver** for file downloads

## How It Works

### File Upload
1. Drag and drop Excel files or click to select multiple files
2. The system validates that files are in Excel format (.xlsx, .xls)

### Invoice Parsing
The application automatically:
- Detects the correct worksheet (prefers "Sheet1" or uses first sheet)
- Finds the header row containing "Invoice No"
- Extracts invoice data including:
  - Invoice Number
  - Date
  - NTN (Tax Number)
  - Customer Name
  - Quantity
  - Exclusive Amount
  - Sales Tax
  - Tax Percentage
  - Product Code

### Report Generation
- Combines all invoice data into a single dataset
- Calculates totals and summary statistics
- Generates an Excel file in the same format as the sample report
- Provides download functionality

## File Structure

```
src/
├── app/
│   └── page.tsx              # Main invoice processor component
├── components/
│   └── ui/                   # shadcn/ui components
├── lib/
│   └── test-data.ts          # Test data for development
└── ...
```

## Usage

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Upload Invoice Files**:
   - Open http://localhost:3000
   - Drag and drop Excel files or click to select
   - Supported formats: .xlsx, .xls

3. **Monitor Processing**:
   - View real-time status for each file
   - See the number of invoices found in each file
   - Check for any parsing errors

4. **Generate Report**:
   - Review the summary statistics
   - Click "Download Combined Report" to get the Excel file

## Expected Excel Structure

The application expects Excel files with the following structure:

### Header Row
- Invoice No | Date | NTN | Name | Quantity | Quantity-A | Exclusive | Sales tax | % | Code

### Data Rows
- Each row represents an individual invoice
- Invoice numbers should be unique
- Dates should be in a recognizable format
- Amounts can include commas and formatting

## Error Handling

- **Invalid Files**: Non-Excel files are rejected with a user-friendly message
- **Parsing Errors**: Files that cannot be parsed are marked with error details
- **Missing Data**: Rows without invoice numbers or dates are skipped

## Browser Compatibility

The application works in all modern browsers that support:
- File API
- ArrayBuffer
- Blob API
- ES6+ JavaScript features

## Development

### Dependencies
- `xlsx`: Excel file reading and writing
- `file-saver`: File download functionality
- `react-dropzone`: Drag-and-drop file upload
- `lucide-react`: Icon library

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Security Considerations

- All processing happens client-side - no files are uploaded to servers
- File content is only processed in memory
- No sensitive data is transmitted or stored
- Temporary files are automatically cleaned up

## Performance

- Efficient memory usage with streaming file readers
- Parallel processing of multiple files
- Optimized Excel parsing with SheetJS
- Minimal impact on browser performance
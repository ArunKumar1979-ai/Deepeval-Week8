import ExcelJS from 'exceljs';
import { Express } from 'express';

/**
 * Excel Dataset interface
 */
export interface ExcelDataset {
  [key: string]: string | number | boolean | null;
}

/**
 * Excel File Response interface
 */
export interface ExcelParseResponse {
  fileName: string;
  sheetNames: string[];
  datasets: {
    sheetName: string;
    data: ExcelDataset[];
    rowCount: number;
    columnNames: string[];
  }[];
  totalDatasets: number;
}

/**
 * Parse Excel file and extract all sheets with their data
 * 
 * @param filePath - Path to the Excel file
 * @returns Parsed data from all sheets
 */
export async function parseExcelFile(filePath: string): Promise<ExcelParseResponse> {
  try {
    // Read the Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheetNames = workbook.worksheets.map(ws => ws.name);

    const datasets = sheetNames.map((sheetName) => {
      // Get worksheet
      const worksheet = workbook.getWorksheet(sheetName);
      
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      // Convert worksheet to array of objects
      const data: ExcelDataset[] = [];
      const headers: { [key: number]: string } = {}; // Map column number to header name
      
      // Get headers from first row (1-indexed)
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        if (cell.value) {
          headers[colNumber] = cell.value.toString();
        }
      });

      // Get data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const rowData: ExcelDataset = {};
        
        // Iterate through columns using the headers map
        Object.entries(headers).forEach(([colNum, header]) => {
          const columnNumber = parseInt(colNum, 10);
          const cell = row.getCell(columnNumber);
          rowData[header] = cell.value as string | number | boolean | null;
        });
        
        data.push(rowData);
      });

      const columnNames = Object.values(headers); // Get header names in order

      return {
        sheetName,
        data,
        rowCount: data.length,
        columnNames,
      };
    });

    const fileName = filePath.split('/').pop() || filePath;

    return {
      fileName,
      sheetNames,
      datasets,
      totalDatasets: datasets.reduce((sum, sheet) => sum + sheet.rowCount, 0),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse Excel file: ${errorMessage}`);
  }
}

/**
 * Convert Excel datasets to JSON format for display
 * 
 * @param datasets - Array of Excel datasets from parseExcelFile
 * @returns JSON stringified data
 */
export function datasetsToJSON(datasets: ExcelDataset[]): string {
  return JSON.stringify(datasets, null, 2);
}

/**
 * Get specific sheet data
 * 
 * @param filePath - Path to the Excel file
 * @param sheetName - Name of the sheet to extract
 * @returns Data from the specified sheet
 */
export async function getSheetData(
  filePath: string,
  sheetName: string
): Promise<ExcelDataset[]> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(sheetName);
    
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook`);
    }

    const data: ExcelDataset[] = [];
    const headers: { [key: number]: string } = {}; // Map column number to header name
    
    // Get headers from first row (1-indexed)
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        headers[colNumber] = cell.value.toString();
      }
    });

    // Get data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const rowData: ExcelDataset = {};
      
      // Iterate through columns using the headers map
      Object.entries(headers).forEach(([colNum, header]) => {
        const columnNumber = parseInt(colNum, 10);
        const cell = row.getCell(columnNumber);
        rowData[header] = cell.value as string | number | boolean | null;
      });
      
      data.push(rowData);
    });

    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get sheet data: ${errorMessage}`);
  }
}

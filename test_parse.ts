import { parseExcelFile } from './lib/excel-parser';
import fs from 'fs';
import path from 'path';

async function main() {
  const filePath = path.join(process.cwd(), 'FEBRUARI.xlsx');
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // Use Uint8Array to be compatible with ArrayBuffer expectation
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    const result = await parseExcelFile(arrayBuffer);
    const data = result.data;
    
    console.log(`Total rows parsed: ${data.length}`);
    
    const medicineNames = new Set(data.map(d => d.name));
    console.log(`Unique medicine names: ${medicineNames.size}`);
    
    const years = data.map(d => d.year).filter(y => y !== undefined && !isNaN(y as number));
    if (years.length > 0) {
      const numericYears = years.map(y => Number(y));
      console.log(`Min year: ${Math.min(...numericYears)}`);
      console.log(`Max year: ${Math.max(...numericYears)}`);
    }

    const medicineCounts: Record<string, number> = {};
    data.forEach(d => {
      medicineCounts[d.name] = (medicineCounts[d.name] || 0) + 1;
    });

    const top10 = Object.entries(medicineCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('Top 10 medicines by history count:');
    top10.forEach(([name, count]) => console.log(`${name}: ${count}`));

  } catch (error) {
    console.error('Error parsing file:', error);
  }
}

main();

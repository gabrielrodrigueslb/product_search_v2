import { writeFile } from 'node:fs/promises';

function escapeCsvValue(value) {
  if (value == null) {
    return '';
  }

  const stringValue = typeof value === 'string'
    ? value
    : JSON.stringify(value);

  if (
    stringValue.includes(',')
    || stringValue.includes('"')
    || stringValue.includes('\n')
    || stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))
  ];

  return `${lines.join('\n')}\n`;
}

export async function writeCsv(filePath, rows) {
  await writeFile(filePath, toCsv(rows), 'utf8');
}

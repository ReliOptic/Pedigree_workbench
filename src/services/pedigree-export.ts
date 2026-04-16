/**
 * Trigger a browser download of text content as a file.
 * Prepends a UTF-8 BOM so Excel opens CSV files with correct Korean encoding.
 */
export function downloadFile(content: string, filename: string, mime: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

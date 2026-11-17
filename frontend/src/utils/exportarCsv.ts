export function exportarTablaCSV(
    filename: string,
    headers: string[],
    rows: (string | number | boolean | null | undefined)[][]
) {
    const cleanCell = (val: string | number | boolean | null | undefined): string => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const headerLine = headers.map(cleanCell).join(',');
    const rowLines = rows.map(row => row.map(cleanCell).join(','));
    const csvContent = [headerLine, ...rowLines].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

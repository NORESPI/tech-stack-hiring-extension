// Export CSV / JSON (fonction Pro). Pur, testable sous Node.

export function csvCell(v) {
    if (v === null || v === undefined) return '';
    let s = Array.isArray(v) ? v.join(' | ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // Neutralise l'injection de formules dans les tableurs.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
    const cols = columns || [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const lines = [cols.map(csvCell).join(',')];
    for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','));
    return lines.join('\r\n') + '\r\n';
}

export const TECH_COLUMNS = ['site', 'name', 'category', 'version', 'confidence', 'evidence', 'scannedAt'];
export const JOB_COLUMNS = ['company', 'title', 'department', 'location', 'remote', 'workplaceType', 'employmentType', 'salary', 'postedAt', 'url', 'ats', 'atsCompanyId'];

export function techRows(scan) {
    return (scan?.technologies || []).map((t) => ({
        site: scan.url, name: t.name, category: t.category, version: t.version || '',
        confidence: t.confidence, evidence: t.evidence, scannedAt: scan.scannedAt,
    }));
}

export function exportPayload(scan, hiring) {
    return {
        source: 'Tech Stack & Hiring Profiler (NORESPI) — local scan',
        site: scan?.url || null,
        scannedAt: scan?.scannedAt || null,
        technologies: scan?.technologies || [],
        hiring: hiring ? { status: hiring.status, ats: hiring.ats || null, signal: hiring.signal || null, jobs: hiring.jobs || [] } : null,
    };
}

/**
 * Parse raw CSV text into { headers: string[], rows: string[][] }
 * Handles quoted fields, comma/semicolon/tab delimiters, CRLF + LF.
 */
export const parseCSV = (text) => {
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalised) return { headers: [], rows: [] };

  // Detect delimiter from first line
  const firstLine = normalised.split('\n')[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount && tabCount > semicolonCount
    ? '\t'
    : semicolonCount > commaCount
      ? ';'
      : ',';

  const splitLine = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const lines = normalised.split('\n').filter(l => l.trim() !== '');
  const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(l => splitLine(l).map(f => f.replace(/^"|"$/g, '').trim()));

  return { headers, rows };
};

/**
 * Heuristically guess which header index maps to each semantic field.
 * Returns { date: idx|null, name: idx|null, amount: idx|null, type: idx|null,
 *           debit: idx|null, credit: idx|null }
 */
export const detectColumns = (headers) => {
  const lower = headers.map(h => h.toLowerCase().trim());

  const find = (...keywords) => {
    for (const kw of keywords) {
      const idx = lower.findIndex(h => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return null;
  };

  return {
    date:   find('date', 'posted', 'trans date', 'transaction date', 'value date'),
    name:   find('description', 'desc', 'memo', 'name', 'payee', 'narrative', 'details', 'merchant'),
    amount: find('amount', 'sum', 'value', 'total'),
    type:   find('type', 'transaction type', 'trans type', 'category'),
    debit:  find('debit', 'withdrawal', 'charge', 'payment'),
    credit: find('credit', 'deposit', 'inflow'),
  };
};

/**
 * Parse a date string into a 'YYYY-MM-DD' string.
 * Handles: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, ISO strings.
 * Returns null if unparseable.
 */
export const parseDate = (raw) => {
  if (!raw) return null;
  const s = raw.trim();

  // Already ISO-ish: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s + 'T12:00:00');
    return isNaN(d) ? null : s.slice(0, 10);
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
    return isNaN(dt) ? null : dt.toISOString().split('T')[0];
  }

  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    const dt = new Date(`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
    return isNaN(dt) ? null : dt.toISOString().split('T')[0];
  }

  // Fallback: let JS parse it
  const fallback = new Date(s);
  return isNaN(fallback) ? null : fallback.toISOString().split('T')[0];
};

/**
 * Map a raw CSV row (string[]) to a transaction-like object using the provided mapping.
 * mapping: { date: idx, name: idx, amount: idx, type: idx|null, debit: idx|null, credit: idx|null }
 * Returns a partially-filled transaction (no id yet).
 */
export const mapRow = (row, mapping) => {
  const get = (idx) => (idx != null && idx < row.length ? row[idx] : '');

  const rawDate   = get(mapping.date);
  const rawName   = get(mapping.name);
  const rawAmount = get(mapping.amount);
  const rawType   = get(mapping.type);
  const rawDebit  = get(mapping.debit);
  const rawCredit = get(mapping.credit);

  // Determine type
  let type = 'expense';
  if (mapping.type != null && rawType) {
    const t = rawType.toLowerCase();
    if (t.includes('credit') || t.includes('deposit') || t.includes('income') || t.includes('inflow')) {
      type = 'income';
    }
  } else if (mapping.debit != null || mapping.credit != null) {
    // Separate debit/credit columns: non-empty credit → income
    const creditVal = parseFloat(rawCredit.replace(/[^0-9.\-]/g, ''));
    const debitVal  = parseFloat(rawDebit.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(creditVal) && creditVal > 0) type = 'income';
    else if (!isNaN(debitVal) && debitVal > 0) type = 'expense';
  } else {
    // Negative amounts → income for some bank exports (Chase-style)
    const num = parseFloat(rawAmount.replace(/[^0-9.\-]/g, ''));
    if (!isNaN(num) && num < 0) type = 'income';
  }

  // Resolve amount
  let amount = 0;
  if (mapping.debit != null || mapping.credit != null) {
    const d = parseFloat(rawDebit.replace(/[^0-9.\-]/g, ''));
    const c = parseFloat(rawCredit.replace(/[^0-9.\-]/g, ''));
    amount = Math.abs(!isNaN(c) && c !== 0 ? c : d) || 0;
  } else {
    amount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.\-]/g, ''))) || 0;
  }

  return {
    type,
    name: rawName.trim() || '(no description)',
    amount,
    date: parseDate(rawDate) || '',
    recurring: 'once',
    endDate: '',
  };
};

/**
 * Validate a mapped transaction row.
 * Returns an error message string or null if valid.
 */
export const validateRow = (tx) => {
  if (!tx.date) return 'Invalid or missing date';
  if (isNaN(tx.amount) || tx.amount <= 0) return 'Invalid or missing amount';
  if (!tx.name || tx.name === '(no description)') return 'Missing description';
  return null;
};

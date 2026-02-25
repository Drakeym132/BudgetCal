import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Check, AlertTriangle, FileText } from 'lucide-react';
import { parseCSV, detectColumns, mapRow, validateRow } from '../utils/csvUtils';

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
    },
    exit: { opacity: 0, scale: 0.95, y: 10 },
};

const STEPS = ['Upload', 'Map Columns', 'Preview', 'Confirm'];

const FIELD_LABELS = {
    date: 'Date',
    name: 'Description',
    amount: 'Amount',
    type: 'Type (optional)',
    debit: 'Debit column (optional)',
    credit: 'Credit column (optional)',
};

const ImportCSVModal = ({ onClose, onImport }) => {
    const [step, setStep] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [fileError, setFileError] = useState('');
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [mapping, setMapping] = useState({
        date: null, name: null, amount: null, type: null, debit: null, credit: null,
    });
    const [mappingError, setMappingError] = useState('');
    // Preview state
    const [previewRows, setPreviewRows] = useState([]); // { tx, error, selected }
    const [sortCol, setSortCol] = useState('date');
    const [sortDir, setSortDir] = useState('asc');
    const fileInputRef = useRef(null);

    // ─── Step 1: File handling ───────────────────────────────────────────────

    const processFile = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
            setFileError('Please upload a .csv, .tsv, or .txt file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const { headers: h, rows: r } = parseCSV(text);
            if (h.length === 0) {
                setFileError('Could not read headers. Make sure the file has a header row.');
                return;
            }
            setHeaders(h);
            setRows(r);
            setFileName(file.name);
            setFileError('');
            // Auto-detect mapping
            const detected = detectColumns(h);
            setMapping(detected);
            setStep(1);
        };
        reader.onerror = () => setFileError('Failed to read file. Please try again.');
        reader.readAsText(file);
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        processFile(e.dataTransfer.files?.[0]);
    }, []);

    const onDragOver = (e) => { e.preventDefault(); setDragActive(true); };
    const onDragLeave = () => setDragActive(false);

    // ─── Step 2: Column mapping ──────────────────────────────────────────────

    const handleMappingChange = (field, value) => {
        setMapping(prev => ({ ...prev, [field]: value === '' ? null : parseInt(value, 10) }));
        setMappingError('');
    };

    const buildPreview = () => {
        // Validate required mappings
        const usingSeparateCols = mapping.debit != null || mapping.credit != null;
        if (mapping.date == null) { setMappingError('Please map the Date column.'); return false; }
        if (mapping.name == null) { setMappingError('Please map the Description column.'); return false; }
        if (!usingSeparateCols && mapping.amount == null) {
            setMappingError('Please map the Amount column (or use separate Debit/Credit columns).'); return false;
        }
        setMappingError('');

        const built = rows.map((row) => {
            const tx = mapRow(row, mapping);
            const error = validateRow(tx);
            return { tx, error, selected: !error };
        });
        setPreviewRows(built);
        return true;
    };

    // ─── Step 3: Preview & sort ──────────────────────────────────────────────

    const sortedPreview = [...previewRows].sort((a, b) => {
        let av, bv;
        if (sortCol === 'date') { av = a.tx.date; bv = b.tx.date; }
        else if (sortCol === 'name') { av = a.tx.name.toLowerCase(); bv = b.tx.name.toLowerCase(); }
        else if (sortCol === 'amount') { av = a.tx.amount; bv = b.tx.amount; }
        else if (sortCol === 'type') { av = a.tx.type; bv = b.tx.type; }
        else { av = 0; bv = 0; }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const toggleRow = (idx) => {
        // idx here is index in sortedPreview, need to find original
        const tx = sortedPreview[idx].tx;
        setPreviewRows(prev =>
            prev.map(r => r.tx === tx ? { ...r, selected: !r.selected } : r)
        );
    };

    const toggleAll = () => {
        const allSelected = previewRows.filter(r => !r.error).every(r => r.selected);
        setPreviewRows(prev =>
            prev.map(r => r.error ? r : { ...r, selected: !allSelected })
        );
    };

    const selectedCount = previewRows.filter(r => r.selected).length;
    const invalidCount = previewRows.filter(r => !!r.error).length;
    const validCount = previewRows.length - invalidCount;
    const allValidSelected = previewRows.filter(r => !r.error).every(r => r.selected);

    // ─── Step 4: Confirm ─────────────────────────────────────────────────────

    const handleConfirm = () => {
        const toImport = previewRows.filter(r => r.selected).map(r => r.tx);
        onImport(toImport);
        onClose();
    };

    // ─── Navigation ──────────────────────────────────────────────────────────

    const goNext = () => {
        if (step === 1) {
            if (!buildPreview()) return;
        }
        setStep(s => s + 1);
    };

    const goBack = () => setStep(s => s - 1);

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <span className="csv-sort-placeholder" />;
        return sortDir === 'asc'
            ? <ChevronUp size={13} className="csv-sort-icon" />
            : <ChevronDown size={13} className="csv-sort-icon" />;
    };

    const formatAmount = (amt, type) =>
        `${type === 'income' ? '+' : '-'}$${Number(amt).toFixed(2)}`;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <motion.div
            className="modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
        >
            <motion.div
                className="modal modal--wide"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <h2>Import CSV</h2>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Step indicator */}
                <div className="csv-step-indicator">
                    {STEPS.map((label, i) => (
                        <React.Fragment key={label}>
                            <div className={`csv-step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                                {i < step ? <Check size={11} /> : i + 1}
                            </div>
                            <span className={`csv-step-label ${i === step ? 'active' : ''}`}>{label}</span>
                            {i < STEPS.length - 1 && <div className={`csv-step-line ${i < step ? 'done' : ''}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* ── STEP 0: Upload ── */}
                {step === 0 && (
                    <div className="csv-step-body">
                        <div
                            className={`csv-drop-zone ${dragActive ? 'drag-active' : ''}`}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={36} className="csv-drop-icon" />
                            <p className="csv-drop-title">Drop your CSV file here</p>
                            <p className="csv-drop-sub">or <span className="csv-browse-link">browse to upload</span></p>
                            <p className="csv-drop-hint">.csv, .tsv, or .txt — exported from your bank</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,.tsv"
                                className="csv-file-input"
                                onChange={e => processFile(e.target.files?.[0])}
                            />
                        </div>
                        {fileError && (
                            <div className="csv-error-msg">
                                <AlertTriangle size={15} /> {fileError}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 1: Map Columns ── */}
                {step === 1 && (
                    <div className="csv-step-body">
                        <div className="csv-file-badge">
                            <FileText size={14} />{fileName}
                            <span className="csv-file-badge-count">{rows.length} rows detected</span>
                        </div>
                        <p className="csv-map-hint">
                            Match each field to a column from your CSV. Auto-detected where possible.
                        </p>
                        <div className="csv-column-map">
                            {Object.entries(FIELD_LABELS).map(([field, label]) => (
                                <div className="csv-map-row" key={field}>
                                    <label className="csv-map-label">{label}</label>
                                    <select
                                        className="csv-map-select"
                                        value={mapping[field] ?? ''}
                                        onChange={e => handleMappingChange(field, e.target.value)}
                                    >
                                        <option value="">— not mapped —</option>
                                        {headers.map((h, i) => (
                                            <option key={i} value={i}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        {mappingError && (
                            <div className="csv-error-msg">
                                <AlertTriangle size={15} /> {mappingError}
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 2: Preview ── */}
                {step === 2 && (
                    <div className="csv-step-body">
                        <div className="csv-preview-meta">
                            <span><strong>{validCount}</strong> valid · <strong>{invalidCount}</strong> invalid</span>
                            <button className="csv-select-all-btn" onClick={toggleAll}>
                                {allValidSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="csv-preview-table-wrap">
                            <table className="csv-preview-table">
                                <thead>
                                    <tr>
                                        <th className="csv-th-check">
                                            <input
                                                type="checkbox"
                                                checked={allValidSelected && validCount > 0}
                                                onChange={toggleAll}
                                                id="csv-toggle-all"
                                            />
                                        </th>
                                        {['date', 'name', 'amount', 'type'].map(col => (
                                            <th
                                                key={col}
                                                className={`csv-th csv-th--${col} ${sortCol === col ? 'sorted' : ''}`}
                                                onClick={() => handleSort(col)}
                                            >
                                                {col.charAt(0).toUpperCase() + col.slice(1)}
                                                <SortIcon col={col} />
                                            </th>
                                        ))}
                                        <th className="csv-th csv-th--status">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPreview.map((item, idx) => (
                                        <tr
                                            key={idx}
                                            className={`csv-tr ${item.error ? 'csv-row--invalid' : ''} ${!item.selected && !item.error ? 'csv-row--deselected' : ''}`}
                                        >
                                            <td className="csv-td-check">
                                                <input
                                                    type="checkbox"
                                                    checked={item.selected}
                                                    disabled={!!item.error}
                                                    onChange={() => !item.error && toggleRow(idx)}
                                                />
                                            </td>
                                            <td className="csv-td csv-td--date">{item.tx.date || '—'}</td>
                                            <td className="csv-td csv-td--name" title={item.tx.name}>{item.tx.name}</td>
                                            <td className={`csv-td csv-td--amount ${item.tx.type}`}>
                                                {formatAmount(item.tx.amount, item.tx.type)}
                                            </td>
                                            <td className={`csv-td csv-td--type ${item.tx.type}`}>
                                                {item.tx.type}
                                            </td>
                                            <td className="csv-td csv-td--status">
                                                {item.error
                                                    ? <span className="csv-status-error" title={item.error}><AlertTriangle size={13} /></span>
                                                    : <span className="csv-status-ok"><Check size={13} /></span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Confirm ── */}
                {step === 3 && (
                    <div className="csv-step-body csv-step-body--confirm">
                        <div className="csv-confirm-summary">
                            <div className="csv-confirm-icon-wrap">
                                <Check size={32} className="csv-confirm-icon" />
                            </div>
                            <h3 className="csv-confirm-title">Ready to Import</h3>
                            <div className="csv-confirm-stats">
                                <div className="csv-confirm-stat csv-confirm-stat--green">
                                    <span className="csv-confirm-stat-number">{selectedCount}</span>
                                    <span className="csv-confirm-stat-label">transactions to add</span>
                                </div>
                                {invalidCount > 0 && (
                                    <div className="csv-confirm-stat csv-confirm-stat--red">
                                        <span className="csv-confirm-stat-number">{invalidCount}</span>
                                        <span className="csv-confirm-stat-label">rows skipped (invalid)</span>
                                    </div>
                                )}
                                {previewRows.filter(r => !r.error && !r.selected).length > 0 && (
                                    <div className="csv-confirm-stat csv-confirm-stat--muted">
                                        <span className="csv-confirm-stat-number">{previewRows.filter(r => !r.error && !r.selected).length}</span>
                                        <span className="csv-confirm-stat-label">rows deselected</span>
                                    </div>
                                )}
                            </div>
                            {selectedCount === 0 && (
                                <p className="csv-confirm-warn">No transactions selected. Go back to select at least one row.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer nav */}
                <div className="csv-modal-footer">
                    {step > 0 && (
                        <button className="csv-nav-btn csv-nav-btn--back" onClick={goBack}>
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {step < STEPS.length - 1 ? (
                        <button className="csv-nav-btn csv-nav-btn--next" onClick={goNext} disabled={step === 0}>
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="csv-nav-btn csv-nav-btn--confirm"
                            onClick={handleConfirm}
                            disabled={selectedCount === 0}
                        >
                            <Check size={16} /> Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ImportCSVModal;

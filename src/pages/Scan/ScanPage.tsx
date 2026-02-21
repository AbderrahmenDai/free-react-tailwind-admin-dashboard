import { useState, useEffect, useRef, forwardRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { scanApi } from '../../services/scanService';
import { productionLineApi, ProductionLine } from '../../services/productionLineService';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import ImportHuModal from '../Import/ImportHuModal';
import TicketLabel from '../../components/print/TicketLabel';
import {
    CheckCircleIcon,
    AlertIcon,
    BoxIcon,
    DocsIcon,
} from '../../icons';

interface ScanStatus {
    handlingUnits: any[];
    progress: {
        total: number;
        validated: number;
        pending: number;
    };
}

/** Returns true if the line type requires Airbag fields */
const isFSB = (line: ProductionLine | null) => line?.type === 'FSB';

export default function ScanPage() {
    // ── Line Selection ───────────────────────────────────────────────
    const [lines, setLines] = useState<ProductionLine[]>([]);
    const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
    const [linesLoading, setLinesLoading] = useState(true);

    // ── OF Selection ─────────────────────────────────────────────────
    const [selectedOf, setSelectedOf] = useState<Record<string, any> | null>(null);

    // ── Scan State ───────────────────────────────────────────────────
    const [scanResult, setScanResult] = useState<Record<string, any> | null>(null);
    const [scanError, setScanError] = useState('');
    const [status, setStatus] = useState<ScanStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Stepper within scan session (1 = quick scan, 2 = validation form)
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    // ── Sequential Scanner State (Step 1) ──────────────────────────
    type ScanFieldKey = 'refClient' | 'codeOf' | 'quantite' | 'numeroHU';
    type FieldStatus = 'idle' | 'loading' | 'ok' | 'error';
    const SCAN_FIELDS: { key: ScanFieldKey; label: string; placeholder: string; icon: string }[] = [
        { key: 'refClient', label: 'Référence Client', placeholder: 'Scanner le code de référence...', icon: '①' },
        { key: 'codeOf', label: 'N° Ordre de Fabrication', placeholder: 'Scanner N° OF...', icon: '②' },
        { key: 'quantite', label: 'Quantité', placeholder: 'Saisir la quantité...', icon: '③' },
        { key: 'numeroHU', label: 'N° Handling Unit (HU)', placeholder: 'Scanner le code HU...', icon: '④' },
    ];
    const AIRBAG_FIELDS: { key: string; label: string }[] = [
        { key: 'machineBarcodeAirbag', label: 'Code Barre Machine Airbag' },
        { key: 'programBarcodeAirbag', label: 'Code Barre Programme Airbag' },
        { key: 'qrCodeAirbag', label: 'QR Code Airbag' },
    ];
    const [scanFieldValues, setScanFieldValues] = useState<Record<ScanFieldKey | string, string>>({
        refClient: '', codeOf: '', quantite: '', numeroHU: '',
        machineBarcodeAirbag: '', programBarcodeAirbag: '', qrCodeAirbag: '',
    });
    const [scanFieldStatus, setScanFieldStatus] = useState<Record<string, FieldStatus>>({
        refClient: 'idle', codeOf: 'idle', quantite: 'idle', numeroHU: 'idle',
        machineBarcodeAirbag: 'idle', programBarcodeAirbag: 'idle', qrCodeAirbag: 'idle',
    });
    const [scanFieldMessages, setScanFieldMessages] = useState<Record<string, string>>({});
    const [scanFieldData, setScanFieldData] = useState<Record<string, Record<string, unknown>>>({});

    // refs for each sequential input
    const fieldRefs = useRef<(HTMLInputElement | null)[]>([]);
    const step2FirstInputRef = useRef<HTMLInputElement>(null);

    const allBaseDone = SCAN_FIELDS.every(f => scanFieldStatus[f.key] === 'ok');
    const allAirbagDone = !isFSB(selectedLine) || AIRBAG_FIELDS.every(f => (scanFieldValues[f.key] || '').trim().length > 0);
    const canSubmitScan = allBaseDone && allAirbagDone;

    // ── Form State (validation form – step 2) ──────────────────────
    const [formValues, setFormValues] = useState({
        codeOf: '',
        refClient: '',
        planificateurCoiffeCodes: [] as string[],
        machineBarcodeAirbag: '',
        programBarcodeAirbag: '',
        qrCodeAirbag: '',
    });

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // ── Print ─────────────────────────────────────────────────────────
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Etiquette-${(scanResult as any)?.data?.hu?.numeroHU || 'New'}`,
    });

    // ── Load lines on mount ──────────────────────────────────────────
    useEffect(() => {
        setLinesLoading(true);
        productionLineApi.getAll()
            .then(data => { setLines(data); })
            .catch(err => { console.error(err); setLines([]); })
            .finally(() => setLinesLoading(false));
    }, []);

    // ── Pre-fill form when OF selected ──────────────────────────────
    useEffect(() => {
        if (selectedOf) {
            loadStatus(selectedOf.id);
            setFormValues(prev => ({
                ...prev,
                codeOf: selectedOf.numeroOF,
                refClient: (selectedOf.reference as any)?.codeReference || '',
            }));
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [selectedOf]);

    // Auto-transition to Step 2 when all scans are done
    useEffect(() => {
        if (canSubmitScan && currentStep === 1) {
            const qty = parseInt(scanFieldValues.quantite, 10) || 1;
            setFormValues(prev => ({
                ...prev,
                codeOf: scanFieldValues.codeOf,
                refClient: scanFieldValues.refClient,
                planificateurCoiffeCodes: Array(qty).fill(''),
                machineBarcodeAirbag: scanFieldValues.machineBarcodeAirbag,
                programBarcodeAirbag: scanFieldValues.programBarcodeAirbag,
                qrCodeAirbag: scanFieldValues.qrCodeAirbag,
            }));
            const timer = setTimeout(() => {
                setCurrentStep(2);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [canSubmitScan, currentStep, scanFieldValues]);

    useEffect(() => {
        if (currentStep === 1) {
            const firstEmptyIdx = SCAN_FIELDS.findIndex(f => scanFieldStatus[f.key] !== 'ok');
            const idx = firstEmptyIdx === -1 ? 0 : firstEmptyIdx;
            setTimeout(() => fieldRefs.current[idx]?.focus(), 150);
        } else if (currentStep === 2) {
            setTimeout(() => step2FirstInputRef.current?.focus(), 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, selectedOf]);

    const loadStatus = async (ofId: string) => {
        try {
            const data = await scanApi.getScanStatus(ofId);
            setStatus(data);
        } catch (e) { console.error(e); }
    };

    /** Validate one field against the backend and advance focus */
    const verifyField = async (fieldKey: ScanFieldKey | string, value: string, currentIdx: number) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        const isAirbag = AIRBAG_FIELDS.some(f => f.key === fieldKey);
        if (isAirbag) {
            // Airbag fields are free-text – mark as ok and advance
            setScanFieldStatus(p => ({ ...p, [fieldKey]: 'ok' }));
            setScanFieldMessages(p => ({ ...p, [fieldKey]: 'Enregistré' }));

            const airbagIdx = AIRBAG_FIELDS.findIndex(f => f.key === fieldKey);
            const nextIdx = currentIdx + 1;
            const totalFields = SCAN_FIELDS.length + AIRBAG_FIELDS.length;

            if (nextIdx < totalFields) {
                setTimeout(() => fieldRefs.current[nextIdx]?.focus(), 100);
            }
            return;
        }

        setScanFieldStatus(p => ({ ...p, [fieldKey]: 'loading' }));
        try {
            let result;
            if (fieldKey === 'refClient') {
                result = await scanApi.verifyScan('reference', trimmed);
            } else if (fieldKey === 'codeOf') {
                result = await scanApi.verifyScan('of', trimmed, {
                    refCode: scanFieldValues['refClient'] || undefined
                });
            } else if (fieldKey === 'quantite') {
                const qty = Number(trimmed);
                if (!trimmed || isNaN(qty) || qty <= 0) {
                    setScanFieldStatus(p => ({ ...p, [fieldKey]: 'error' }));
                    setScanFieldMessages(p => ({ ...p, [fieldKey]: 'Quantité invalide (nombre > 0)' }));
                    return;
                }
                result = { ok: true, step: fieldKey, message: `Qté : ${qty}` };
            } else if (fieldKey === 'numeroHU') {
                const ofData = scanFieldData['codeOf'] as { id?: string; numeroOF?: string } | undefined;
                result = await scanApi.verifyScan('hu', trimmed, {
                    ofId: ofData?.id as string | undefined,
                    ofNumero: ofData?.numeroOF as string | undefined ?? scanFieldValues['codeOf'],
                });
            } else {
                result = { ok: true, step: fieldKey, message: 'Enregistré' };
            }

            if (result.ok) {
                setScanFieldStatus(p => ({ ...p, [fieldKey]: 'ok' }));
                setScanFieldMessages(p => ({ ...p, [fieldKey]: result.message }));
                if (result.data) setScanFieldData(p => ({ ...p, [fieldKey]: result.data as Record<string, unknown> }));
                if (fieldKey === 'codeOf' && result.data) {
                    setSelectedOf(result.data as Record<string, unknown>);
                }
                const nextIdx = currentIdx + 1;
                if (nextIdx < SCAN_FIELDS.length) {
                    setTimeout(() => fieldRefs.current[nextIdx]?.focus(), 100);
                } else if (isFSB(selectedLine) && nextIdx < SCAN_FIELDS.length + AIRBAG_FIELDS.length) {
                    setTimeout(() => fieldRefs.current[nextIdx]?.focus(), 100);
                }
            } else {
                setScanFieldStatus(p => ({ ...p, [fieldKey]: 'error' }));
                setScanFieldMessages(p => ({ ...p, [fieldKey]: result.message }));
            }
        } catch {
            setScanFieldStatus(p => ({ ...p, [fieldKey]: 'error' }));
            setScanFieldMessages(p => ({ ...p, [fieldKey]: 'Erreur de connexion' }));
        }
    };

    const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldKey: string, idx: number) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            verifyField(fieldKey as ScanFieldKey, scanFieldValues[fieldKey], idx);
        }
    };

    const resetSequentialScan = () => {
        setScanFieldValues({ refClient: '', codeOf: '', quantite: '', numeroHU: '', machineBarcodeAirbag: '', programBarcodeAirbag: '', qrCodeAirbag: '' });
        setScanFieldStatus({ refClient: 'idle', codeOf: 'idle', quantite: 'idle', numeroHU: 'idle', machineBarcodeAirbag: 'idle', programBarcodeAirbag: 'idle', qrCodeAirbag: 'idle' });
        setScanFieldMessages({});
        setScanFieldData({});
        setSelectedOf(null);
        setTimeout(() => fieldRefs.current[0]?.focus(), 150);
    };

    const handleFinalScanSubmit = async () => {
        if (!canSubmitScan || !selectedOf) return;

        // Multi-Planificateur Coiffe validation if in Step 2
        if (currentStep === 2) {
            const allFilled = formValues.planificateurCoiffeCodes.every(c => c.trim().length > 0);
            if (!allFilled) {
                setScanError(`Veuillez scanner les ${formValues.planificateurCoiffeCodes.length} codes Planificateur Coiffe requis.`);
                return;
            }
        }

        setLoading(true);
        setScanError('');
        try {
            const quantite = parseInt(scanFieldValues['quantite'], 10) || 1;
            const result = await scanApi.processScan(selectedOf.id as string, {
                reference: scanFieldValues['refClient'],
                numeroHU: scanFieldValues['numeroHU'],
                quantite,
                qualite: 'CONFORME',
                // Additional data from Step 2
                planificateurCoiffeCodes: formValues.planificateurCoiffeCodes,
                machineBarcodeAirbag: formValues.machineBarcodeAirbag,
                programBarcodeAirbag: formValues.programBarcodeAirbag,
                qrCodeAirbag: formValues.qrCodeAirbag
            });
            setScanResult(result);
            loadStatus(selectedOf.id);
            resetSequentialScan();
            // Go back to step 1 for next HU
            setCurrentStep(1);
        } catch (err: unknown) {
            const data = (err as { response?: { data?: { message?: string } } }).response?.data;
            setScanError(data?.message || 'Erreur lors de la validation');
            setScanResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const calculateStats = () => {
        if (!status || !Array.isArray(status.handlingUnits)) return { piecesScan: 0, piecesReste: 0 };
        const units = status.handlingUnits as { statut: string; quantiteReelle?: number }[];
        const piecesScan = units
            .filter(h => h.statut === 'VALIDE')
            .reduce((acc, val) => acc + (val.quantiteReelle || 0), 0);
        const piecesReste = Math.max(0, selectedOf.quantiteTotale - piecesScan);
        return { piecesScan, piecesReste };
    };

    const stats = selectedOf ? calculateStats() : { piecesScan: 0, piecesReste: 0 };

    // ════════════════════════════════════════════════════════════════
    // STEP 0 — Line Selection
    // ════════════════════════════════════════════════════════════════
    if (!selectedLine) {
        const typeColors: Record<string, string> = {
            FSB: 'from-orange-500 to-red-600',
            FSC: 'from-blue-500 to-indigo-600',
            RSB: 'from-emerald-500 to-teal-600',
            RSC: 'from-purple-500 to-violet-600',
            D34: 'from-gray-500 to-gray-700',
        };
        const typeBg: Record<string, string> = {
            FSB: 'border-orange-200 dark:border-orange-700 hover:border-orange-400',
            FSC: 'border-blue-200 dark:border-blue-700 hover:border-blue-400',
            RSB: 'border-emerald-200 dark:border-emerald-700 hover:border-emerald-400',
            RSC: 'border-purple-200 dark:border-purple-700 hover:border-purple-400',
            D34: 'border-gray-200 dark:border-gray-700 hover:border-gray-400',
        };

        // Group lines by type
        const byType = lines.reduce<Record<string, ProductionLine[]>>((acc, l) => {
            acc[l.type] = acc[l.type] || [];
            acc[l.type].push(l);
            return acc;
        }, {});

        return (
            <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
                <PageMeta title="Sélection Ligne | GALIA" description="Choisir la ligne de production" />
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-2xl mb-4">
                            <BoxIcon className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Sélectionnez votre Ligne</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Choisissez la ligne sur laquelle vous travaillez pour commencer le scan</p>
                    </div>

                    {linesLoading ? (
                        <div className="text-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Chargement des lignes...</p>
                        </div>
                    ) : lines.length === 0 ? (
                        <div className="text-center p-12 border-2 border-dashed border-red-200 dark:border-red-800 rounded-2xl">
                            <div className="text-4xl mb-3">⚠️</div>
                            <p className="text-gray-700 dark:text-gray-300 font-bold">Aucune ligne de production trouvée</p>
                            <p className="text-sm text-gray-500 mt-1">Vérifiez que le serveur est actif et que des lignes sont configurées.</p>
                            <button
                                onClick={() => { setLinesLoading(true); productionLineApi.getAll().then(d => setLines(d)).catch(console.error).finally(() => setLinesLoading(false)); }}
                                className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-bold hover:bg-brand-600 transition-colors"
                            >↺ Réessayer</button>
                        </div>
                    ) : null}

                    {Object.entries(byType).map(([type, typeLines]) => (
                        <div key={type} className="mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${typeColors[type] || 'from-gray-400 to-gray-600'}`} />
                                <h2 className="font-bold text-sm uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Lignes {type}
                                    {type === 'FSB' && <span className="ml-2 text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">Airbag requis</span>}
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {typeLines.map(line => (
                                    <button
                                        key={line.id}
                                        onClick={() => setSelectedLine(line)}
                                        disabled={line.statut === 'stopped'}
                                        className={`relative group p-4 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 text-left shadow-sm
                                            ${line.statut === 'stopped'
                                                ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                                                : `cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${typeBg[type] || 'border-gray-200 hover:border-gray-400'}`
                                            }`}
                                    >
                                        {/* Type badge */}
                                        <div className={`absolute top-2 right-2 text-[10px] font-black text-white px-1.5 py-0.5 rounded-md bg-gradient-to-r ${typeColors[type] || 'from-gray-400 to-gray-600'}`}>
                                            {type}
                                        </div>
                                        <div className="font-black text-xl text-gray-900 dark:text-white mb-1">{line.code}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{line.nom}</div>
                                        {/* Status */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${line.statut === 'active' ? 'bg-emerald-500 animate-pulse' : line.statut === 'maintenance' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                            <span className={`text-xs font-semibold capitalize ${line.statut === 'active' ? 'text-emerald-600 dark:text-emerald-400' : line.statut === 'maintenance' ? 'text-amber-600' : 'text-red-600'}`}>
                                                {line.statut}
                                            </span>
                                        </div>
                                        {/* Efficiency bar */}
                                        {line.statut !== 'stopped' && (
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                                                    <div
                                                        className={`h-1 rounded-full bg-gradient-to-r ${typeColors[type]}`}
                                                        style={{ width: `${line.efficacite || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-0.5">{line.efficacite}% efficacité</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }


    // ════════════════════════════════════════════════════════════════
    // STEP 2/3 — Scan Session (fields adapt to line type)
    // ════════════════════════════════════════════════════════════════
    const isAirbagLine = isFSB(selectedLine);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-10">
            <PageMeta title="Scan Station | GALIA" description="Poste de Scannage" />

            {/* ── Sticky Header ── */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm sticky top-0 z-30 backdrop-blur-md bg-white/90 dark:bg-gray-800/90">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <BoxIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                Scannage Fin de Ligne
                            </h1>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                Ligne:
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedLine.code}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isAirbagLine ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {selectedLine.type}{isAirbagLine ? ' · Airbag' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Step tabs */}
                    <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-xl">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${currentStep === 1
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-500'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                                }`}
                        >
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs mr-1">1</span>
                            Scan HU
                        </button>
                        <button
                            onClick={() => setCurrentStep(2)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${currentStep === 2
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-500'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600/50'
                                }`}
                        >
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs mr-1">2</span>
                            Validation
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                            onClick={() => setSelectedOf(null)}
                        >
                            ← Changer OF
                        </Button>
                        <Button
                            className="bg-white hover:bg-red-50 text-red-600 border border-transparent hover:border-red-200 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                            onClick={() => { setSelectedOf(null); setSelectedLine(null); }}
                        >
                            ⏏ Changer Ligne
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                {/* ── STEP 1: Sequential Scanner ── */}
                {currentStep === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                        {/* ── LEFT: Sequential scan card ── */}
                        <div className="lg:col-span-6">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000" />
                                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">

                                    {/* Header */}
                                    <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Scanner Séquentiel</p>
                                            <h2 className="text-xl font-black text-white">Scannage des 4 codes</h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isAirbagLine ? 'bg-orange-500/30 text-orange-300' : 'bg-blue-500/30 text-blue-300'}`}>
                                                {selectedLine.code} · {selectedLine.type}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Success overlay */}
                                    {scanResult && (
                                        <div className="absolute inset-0 bg-emerald-500/95 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-white p-8 text-center rounded-2xl">
                                            <div className="bg-white/20 p-4 rounded-full mb-4 animate-pulse">
                                                <CheckCircleIcon className="w-12 h-12 text-white" />
                                            </div>
                                            <h2 className="text-4xl font-black mb-2">HU VALIDÉ</h2>
                                            <p className="text-lg opacity-90 mb-6">Unité enregistrée avec succès</p>
                                            <div className="flex gap-3">
                                                <Button onClick={() => handlePrint()} className="bg-white text-emerald-800 hover:bg-emerald-50 border-none px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                                                    <DocsIcon className="w-5 h-5" /> Imprimer
                                                </Button>
                                                <Button onClick={() => setScanResult(null)} className="bg-white/20 text-white border-white/30 px-6 py-3 rounded-full font-bold">
                                                    Suivant
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error banner */}
                                    {scanError && (
                                        <div className="mx-4 mt-4 px-4 py-3 bg-red-500/20 border border-red-500/40 rounded-xl flex items-start gap-3">
                                            <AlertIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-red-300">Erreur de validation</p>
                                                <p className="text-xs text-red-400 mt-0.5">{scanError}</p>
                                            </div>
                                            <button onClick={() => setScanError('')} className="ml-auto text-red-400 hover:text-white text-lg font-bold">×</button>
                                        </div>
                                    )}

                                    {/* Fields list */}
                                    <div className="p-5 space-y-3">
                                        {SCAN_FIELDS.map((field, idx) => {
                                            const st = scanFieldStatus[field.key];
                                            const msg = scanFieldMessages[field.key];
                                            const isActive = scanFieldStatus[field.key] !== 'ok' && SCAN_FIELDS.slice(0, idx).every(f => scanFieldStatus[f.key] === 'ok');
                                            return (
                                                <div key={field.key}
                                                    className={`relative rounded-xl border-2 transition-all duration-200 ${st === 'ok' ? 'border-emerald-500/60 bg-emerald-500/5' :
                                                        st === 'error' ? 'border-red-500/60 bg-red-500/5' :
                                                            st === 'loading' ? 'border-orange-400/60 bg-orange-500/5' :
                                                                isActive ? 'border-orange-400/80 bg-white/5 ring-2 ring-orange-400/30' :
                                                                    'border-white/10 bg-white/3 opacity-70'
                                                        }`}
                                                >
                                                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                                                        <span className={`text-base font-black ${st === 'ok' ? 'text-emerald-400' :
                                                            st === 'error' ? 'text-red-400' :
                                                                isActive ? 'text-orange-400' : 'text-gray-600'
                                                            }`}>{field.icon}</span>
                                                        <label className={`text-xs font-bold uppercase tracking-wider ${st === 'ok' ? 'text-emerald-400' :
                                                            st === 'error' ? 'text-red-400' :
                                                                isActive ? 'text-orange-400' : 'text-gray-500'
                                                            }`}>{field.label}</label>
                                                        <div className="ml-auto">
                                                            {st === 'ok' && <span className="text-emerald-400 text-lg font-black">✓</span>}
                                                            {st === 'error' && <span className="text-red-400 text-lg font-black">✗</span>}
                                                            {st === 'loading' && <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />}
                                                        </div>
                                                    </div>
                                                    <div className="px-4 pb-3">
                                                        <input
                                                            ref={el => { fieldRefs.current[idx] = el; }}
                                                            type="text"
                                                            value={scanFieldValues[field.key]}
                                                            onChange={e => setScanFieldValues(p => ({ ...p, [field.key]: e.target.value }))}
                                                            onKeyDown={e => handleFieldKeyDown(e, field.key, idx)}
                                                            onBlur={() => {
                                                                if (scanFieldValues[field.key].trim() && scanFieldStatus[field.key] === 'idle')
                                                                    verifyField(field.key as ScanFieldKey, scanFieldValues[field.key], idx);
                                                            }}
                                                            placeholder={isActive ? field.placeholder : (st === 'ok' ? '✓ Validé' : 'En attente...')}
                                                            disabled={!isActive && st !== 'error'}
                                                            className={`w-full bg-transparent font-mono text-base font-bold text-white placeholder-gray-600 focus:outline-none py-1 border-none ${!isActive && st !== 'error' ? 'cursor-not-allowed opacity-50' : ''
                                                                }`}
                                                        />
                                                        {msg && st !== 'idle' && (
                                                            <p className={`text-xs mt-1 ${st === 'ok' ? 'text-emerald-400' :
                                                                st === 'error' ? 'text-red-400' : 'text-orange-400'
                                                                }`}>{msg}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Airbag fields (FSB only) */}
                                        {isAirbagLine && (
                                            <div className="border-2 border-orange-500/40 rounded-xl bg-orange-500/5 p-3 space-y-2">
                                                <p className="text-xs font-black text-orange-400 uppercase tracking-wider mb-2">⚡ Airbag — FSB uniquement</p>
                                                {AIRBAG_FIELDS.map((af, aidx) => (
                                                    <div key={af.key} className={`rounded-lg border border-white/10 px-3 py-2 ${scanFieldStatus[af.key] === 'ok' ? 'border-emerald-500/50 bg-emerald-500/5' : ''
                                                        }`}>
                                                        <label className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-1">{af.label}</label>
                                                        <input
                                                            ref={el => { fieldRefs.current[SCAN_FIELDS.length + aidx] = el; }}
                                                            type="text"
                                                            value={scanFieldValues[af.key]}
                                                            disabled={!allBaseDone}
                                                            onChange={e => setScanFieldValues(p => ({ ...p, [af.key]: e.target.value }))}
                                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); verifyField(af.key, scanFieldValues[af.key], SCAN_FIELDS.length + aidx); } }}
                                                            placeholder={allBaseDone ? 'Scanner...' : 'En attente des 4 champs...'}
                                                            className="w-full bg-transparent font-mono text-sm font-bold text-white placeholder-gray-600 focus:outline-none border-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit */}
                                    <div className="px-5 pb-5 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={resetSequentialScan}
                                            className="px-4 py-2.5 text-sm font-bold text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all"
                                        >
                                            ↺ Réinitialiser
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canSubmitScan || loading}
                                            onClick={handleFinalScanSubmit}
                                            className={`flex-1 py-3 rounded-xl font-black text-base transition-all duration-200 ${canSubmitScan && !loading
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 hover:scale-[1.02] active:scale-95'
                                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/10'
                                                }`}
                                        >
                                            {loading ? 'Validation...' : canSubmitScan ? '✓ Valider le HU' : `Scan ${SCAN_FIELDS.filter(f => scanFieldStatus[f.key] !== 'ok').length} restant(s)`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Stats Panel ── */}
                        <div className="lg:col-span-6 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 h-full">
                                {selectedOf ? (
                                    <StatsPanel selectedOf={selectedOf} status={status} stats={stats} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">📋</div>
                                        <p className="font-semibold text-gray-500 dark:text-gray-400">Scannez l'OF pour voir les statistiques</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Le panneau s'activera après validation du champ ②</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Validation Form (fields depend on line type) ── */}
                {currentStep === 2 && (
                    <div className="grid grid-cols-12 gap-6 min-h-[600px]">
                        {/* KPI Column */}
                        <div className="col-span-12 lg:col-span-3 space-y-4">
                            <KPICard title="Objectif" value={selectedOf?.quantiteTotale as number || 0} color="blue" />
                            <KPICard title="Production" value={stats.piecesScan} color="green" icon={<CheckCircleIcon className="w-6 h-6" />} />
                            <KPICard title="Ecart" value={`-${stats.piecesReste}`} color="red" icon={<AlertIcon className="w-6 h-6" />} />
                        </div>

                        {/* Main Form */}
                        <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                            {/* OF Info */}
                            {selectedOf && (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -mr-8 -mt-8 pointer-events-none" />
                                    <StatsPanel selectedOf={selectedOf} status={status} stats={stats} compact />
                                </div>
                            )}

                            {/* Form Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {/* Tab bar */}
                                <div className="flex border-b border-gray-100 dark:border-gray-700">
                                    <button className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10">
                                        Scannage et remplissage
                                    </button>
                                </div>

                                <div className="p-8">
                                    {/* Line type banner */}
                                    <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border ${isAirbagLine ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-700' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-700'}`}>
                                        <div className={`w-2.5 h-2.5 rounded-full ${isAirbagLine ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                        <span className={`text-sm font-bold ${isAirbagLine ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                            Ligne {selectedLine.code} · Type {selectedLine.type}
                                        </span>
                                        <span className={`text-xs ${isAirbagLine ? 'text-orange-600' : 'text-blue-600'} dark:text-gray-400 ml-auto`}>
                                            {isAirbagLine
                                                ? '7 champs requis (Airbag inclus)'
                                                : '3 champs requis'}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {/* ── Fixed: Ref Client + Code OF (Read-only, from OF) ── */}
                                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Code OF</label>
                                                <div className="text-gray-900 dark:text-white font-mono font-bold bg-white dark:bg-gray-600 px-3 py-2 rounded shadow-sm border border-gray-200 dark:border-gray-500">
                                                    {formValues.codeOf}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Ref Client</label>
                                                <div className="text-gray-900 dark:text-white font-mono font-bold bg-white dark:bg-gray-600 px-3 py-2 rounded shadow-sm border border-gray-200 dark:border-gray-500">
                                                    {formValues.refClient}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Dynamic Planificateur Coiffe Inputs (Collect N codes based on Qty) ── */}
                                        <div className="space-y-4">
                                            {formValues.planificateurCoiffeCodes.map((code, index) => (
                                                <ModernInput
                                                    key={index}
                                                    ref={index === 0 ? step2FirstInputRef : null}
                                                    name={`planificateurCoiffe_${index}`}
                                                    label={`Planificateur Coiffe ${index + 1} / ${formValues.planificateurCoiffeCodes.length}`}
                                                    placeholder="Saisir ou scanner..."
                                                    value={code}
                                                    onChange={(e) => {
                                                        const newCodes = [...formValues.planificateurCoiffeCodes];
                                                        newCodes[index] = e.target.value;
                                                        setFormValues(prev => ({ ...prev, planificateurCoiffeCodes: newCodes }));
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const nextInput = document.getElementsByName(`planificateurCoiffe_${index + 1}`)[0];
                                                            if (nextInput) {
                                                                (nextInput as HTMLInputElement).focus();
                                                            } else {
                                                                // If last one, blur or ready for final validate?
                                                                (e.target as HTMLInputElement).blur();
                                                            }
                                                        }
                                                    }}
                                                />
                                            ))}
                                            {formValues.planificateurCoiffeCodes.length === 0 && (
                                                <div className="text-center py-4 bg-gray-50 rounded-xl text-gray-400 text-sm">
                                                    Aucune quantité définie. Veuillez retourner à l'étape 1.
                                                </div>
                                            )}
                                        </div>

                                        {/* ── FSB Only: Airbag fields ── */}
                                        {isAirbagLine && (
                                            <div className="relative mt-8">
                                                <div className="absolute -top-2.5 left-4 bg-white dark:bg-gray-800 px-2 text-xs font-bold text-orange-500 uppercase tracking-wider">Airbag — FSB uniquement</div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 pb-2 px-4 border border-orange-200 dark:border-orange-700/40 rounded-xl bg-orange-50/30 dark:bg-orange-900/5">
                                                    <ModernInput
                                                        name="machineBarcodeAirbag"
                                                        label="Barcode Machine"
                                                        placeholder="Scanner..."
                                                        value={formValues.machineBarcodeAirbag}
                                                        onChange={handleFormChange}
                                                        accent="orange"
                                                    />
                                                    <ModernInput
                                                        name="programBarcodeAirbag"
                                                        label="Barcode Programme"
                                                        placeholder="Scanner..."
                                                        value={formValues.programBarcodeAirbag}
                                                        onChange={handleFormChange}
                                                        accent="orange"
                                                    />
                                                    <ModernInput
                                                        name="qrCodeAirbag"
                                                        label="QR Code Airbag"
                                                        placeholder="Scanner..."
                                                        value={formValues.qrCodeAirbag}
                                                        onChange={handleFormChange}
                                                        accent="orange"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                        <Button className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-6 py-3 rounded-xl font-bold">Annuler</Button>
                                        <Button
                                            onClick={() => handlePrint()}
                                            className="bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2"
                                        >
                                            <DocsIcon className="w-5 h-5" /> Imprimer
                                        </Button>
                                        <div
                                            onClick={handleFinalScanSubmit}
                                            className={`flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center font-bold text-lg cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] active:scale-95 py-3 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                            ) : (
                                                <CheckCircleIcon className="w-6 h-6 mr-2" />
                                            )}
                                            VALIDER (OK)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden print area */}
            <div className="hidden">
                {(scanResult || selectedOf) && selectedOf && (
                    <TicketLabel
                        ref={printRef}
                        of={selectedOf}
                        hu={(scanResult as Record<string, Record<string, Record<string, string>>> | null)?.data?.hu || { numeroHU: 'PREVIEW' }}
                        reference={(selectedOf as Record<string, unknown>).reference}
                    />
                )}
            </div>

            {/* Import Modal */}
            {isImportModalOpen && selectedOf && (
                <ImportHuModal
                    ofId={selectedOf.id}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => loadStatus(selectedOf.id)}
                />
            )}

            <style>{`
                .fade-out-delay { animation: fadeOut 0.5s forwards; animation-delay: 5s; }
                @keyframes fadeOut { to { opacity: 0; pointer-events: none; } }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KPICard({ title, value, color, icon }: { title: string; value: number | string; color: string; icon?: React.ReactNode }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
        red: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
    };
    return (
        <div className={`p-5 rounded-2xl border ${colors[color] || colors.blue} shadow-sm relative overflow-hidden transition-transform hover:scale-[1.02]`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold uppercase tracking-wider opacity-70">{title}</span>
                {icon && <div className="opacity-80">{icon}</div>}
            </div>
            <div className="text-4xl font-black tracking-tight">{value}</div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white opacity-20 blur-xl" />
        </div>
    );
}

const ModernInput = forwardRef<HTMLInputElement, {
    name: string; label: string; value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string; accent?: string;
}>(({ name, label, value, onChange, onKeyDown, placeholder, accent = 'indigo' }, ref) => {
    const ring = accent === 'orange' ? 'focus:ring-orange-500/50 focus:border-orange-500' : 'focus:ring-indigo-500/50 focus:border-indigo-500';
    const labelColor = accent === 'orange' ? 'group-focus-within:text-orange-600' : 'group-focus-within:text-indigo-600';
    return (
        <div className="group">
            <label className={`text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ${labelColor} transition-colors`}>{label}</label>
            <div className="relative">
                <input
                    ref={ref}
                    name={name}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    className={`w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${ring} transition-all font-medium`}
                    placeholder={placeholder}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-300">
                    <BoxIcon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
});


function StatsPanel({ selectedOf, status, stats, compact = false }: {
    selectedOf: Record<string, unknown>; status: Record<string, unknown> | null; stats: { piecesScan: number; piecesReste: number }; compact?: boolean;
}) {
    return (
        <div className="flex flex-col h-full">
            <div className={`flex justify-between items-center ${compact ? 'mb-4 border-b border-gray-100 dark:border-gray-700 pb-4' : 'mb-8'}`}>
                <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-800 dark:text-white flex items-center gap-2`}>
                    {!compact && <span className="w-2 h-8 rounded-full bg-indigo-500 block" />}
                    Information HU
                </h2>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-4' : 'gap-8'} mb-8`}>
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <InfoRow label="Ref Client" value={(selectedOf?.reference as Record<string, string>)?.codeReference} />
                    <InfoRow label="N° OF" value={selectedOf?.numeroOF as string} />
                    <InfoRow label="Qté Totale" value={selectedOf?.quantiteTotale as number} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex justify-between items-center border border-indigo-100 dark:border-indigo-800/30">
                        <span className="font-bold text-indigo-800 dark:text-indigo-300 text-sm uppercase tracking-wide">Total à contrôler</span>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{status?.progress?.total || 0}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-800/30">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs uppercase mb-1">Contrôlées</span>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{status?.progress?.validated || 0}</div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 flex flex-col items-center justify-center border border-rose-100 dark:border-rose-800/30">
                        <span className="font-bold text-rose-800 dark:text-rose-300 text-xs uppercase mb-1">Restant</span>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{status?.progress?.pending || 0}</div>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="py-3 px-4">Nb HU</th>
                                <th className="py-3 px-4">Pcs OF</th>
                                <th className="py-3 px-4 text-emerald-600">HU Scan</th>
                                <th className="py-3 px-4 text-emerald-600">Pcs Scan</th>
                                <th className="py-3 px-4 text-rose-600">Reste HU</th>
                                <th className="py-3 px-4 text-rose-600">Reste Pcs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">{status?.progress?.total || 0}</td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400 font-mono">{selectedOf.quantiteTotale}</td>
                                <td className="py-4 px-4 font-bold text-emerald-600">{status?.progress?.validated || 0}</td>
                                <td className="py-4 px-4 font-medium text-emerald-600">{stats.piecesScan}</td>
                                <td className="py-4 px-4 font-bold text-rose-600 bg-rose-50/30">{status?.progress?.pending || 0}</td>
                                <td className="py-4 px-4 font-medium text-rose-600 bg-rose-50/30">{stats.piecesReste}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined }) {
    return (
        <div className="flex items-center justify-between border-b border-gray-200/50 last:border-0 pb-2 last:pb-0">
            <span className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{label}</span>
            <div className="font-mono text-sm font-bold text-gray-800 dark:text-white bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600 shadow-sm">{value || '-'}</div>
        </div>
    );
}

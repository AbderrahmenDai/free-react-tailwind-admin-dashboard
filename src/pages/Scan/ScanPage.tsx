import { useState, useEffect, useRef } from 'react';
import { ofApi } from '../../services/ofService';
import { scanApi } from '../../services/scanService';
import PageMeta from '../../components/common/PageMeta';
import Button from '../../components/ui/button/Button';
import ImportHuModal from '../Import/ImportHuModal';
import {
    CheckCircleIcon,
    AlertIcon,
    BoxIcon,
    FileIcon,
    DocsIcon,
    FolderIcon
} from '../../icons';

export default function ScanPage() {
    const [ofs, setOfs] = useState([]);
    const [selectedOf, setSelectedOf] = useState<any>(null);
    const [scanValue, setScanValue] = useState("");
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanError, setScanError] = useState("");
    const [status, setStatus] = useState<any>(null);
    const [forceValidation, setForceValidation] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Stepper State
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    // Step 2 Form State
    const [formValues, setFormValues] = useState({
        codeOf: "",
        refClient: "",
        machineBarcode: "",
        planner: "",
        programBarcode: "",
        qrCode: ""
    });

    // This state holds the data to display in the "Orange Box" (Last scanned or current)
    const [displayData, setDisplayData] = useState({
        reference: "",
        quantite: "",
        ofNum: "",
        huCode: ""
    });

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        loadOfs();
    }, []);

    useEffect(() => {
        if (selectedOf) {
            loadStatus(selectedOf.id);
            setDisplayData(prev => ({ ...prev, ofNum: selectedOf.numeroOF, reference: selectedOf.reference?.codeReference }));
            // Pre-fill form values for step 2 if available
            setFormValues(prev => ({
                ...prev,
                codeOf: selectedOf.numeroOF,
                refClient: selectedOf.reference?.codeReference || ""
            }));
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [selectedOf]);

    // Focus input when step changes
    useEffect(() => {
        if (currentStep === 1) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [currentStep]);

    const loadOfs = async () => {
        try {
            const data = await ofApi.getAllOFs();
            setOfs(data);
        } catch (e) { console.error(e); }
    };

    const loadStatus = async (ofId: string) => {
        try {
            const data = await scanApi.getScanStatus(ofId);
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    const parseGaliaValues = (rawValue: string) => {
        const refMatch = rawValue.match(/P([A-Z0-9-]+)/);
        const qtyMatch = rawValue.match(/Q([0-9.]+)/);
        const serMatch = rawValue.match(/S([A-Z0-9]+)/);
        const indMatch = rawValue.match(/M([A-Z0-9]+)/);
        const qualMatch = rawValue.match(/J([A-Z0-9]+)/);

        return {
            reference: refMatch ? refMatch[1] : "",
            quantite: qtyMatch ? parseFloat(qtyMatch[1]) : 0,
            numeroHU: serMatch ? serMatch[1] : "",
            indice: indMatch ? indMatch[1] : "",
            qualite: qualMatch ? qualMatch[1] : "CONFORME"
        };
    };

    const handleScanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setScanError("");

        // Allow submission if we have manual data even if scanValue is empty (manual entry scenario)
        // OR if we have a scanValue
        if (!scanValue && (!displayData.quantite || !displayData.reference)) return;

        setLoading(true);

        try {
            const galiaData: any = scanValue ? parseGaliaValues(scanValue) : {};

            // Fallback for simple testing
            if (scanValue && !galiaData.numeroHU && !galiaData.reference) {
                if (/^[A-Z0-9-_]+$/.test(scanValue)) {
                    galiaData.numeroHU = scanValue; // Assume plain HU ID
                }
            }

            // Determine final values: Scan > Manual Input > Default
            const finalReference = galiaData.reference || displayData.reference || selectedOf.reference?.codeReference;
            const finalQuantite = galiaData.quantite ? galiaData.quantite.toString() : (displayData.quantite || "");
            const finalHuCode = galiaData.numeroHU || scanValue || `MANUAL-${Date.now()}`; // Fallback if no HU scan

            // Update Display Immediately for feedback
            setDisplayData({
                reference: finalReference,
                quantite: finalQuantite,
                ofNum: selectedOf.numeroOF,
                huCode: finalHuCode
            });

            // Prepare payload
            const processingData = {
                ...galiaData,
                reference: finalReference,
                quantite: finalQuantite ? parseInt(finalQuantite) : 0,
                numeroHU: finalHuCode
            };

            const result = await scanApi.processScan(selectedOf.id, processingData, forceValidation);

            setScanResult(result);
            setScanValue("");
            // Don't clear displayData - keep it for reference
            loadStatus(selectedOf.id);
            setForceValidation(false);
        } catch (err: any) {
            const message = err.response?.data?.message || "Erreur de scan";
            const errors = err.response?.data?.errors || [];
            const errorMsg = message + (errors.length ? ": " + errors.join(", ") : "");
            setScanError(errorMsg);
            setScanResult(null); // Clear success state
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleRefHuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScanValue(e.target.value);
    };

    const calculateStats = () => {
        if (!status || !status.handlingUnits) return { piecesScan: 0, piecesReste: 0 };

        // Assuming only VALIDE counts towards pieces produced.
        const piecesScan = status.handlingUnits
            .filter((h: any) => h.statut === 'VALIDE')
            .reduce((acc: number, val: any) => acc + (val.quantiteReelle || 0), 0);

        const piecesReste = Math.max(0, selectedOf.quantiteTotale - piecesScan);
        return { piecesScan, piecesReste };
    };

    const stats = calculateStats();

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const handleDisplayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDisplayData(prev => ({ ...prev, [name]: value }));
    };

    // ... (logic remains)

    if (!selectedOf) {
        return (
            <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
                <PageMeta title="Scan Selection | GALIA" description="Choix OF" />
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                    <DocsIcon className="w-6 h-6" />
                                </span>
                                Sélectionner un Ordre de Fabrication
                            </h3>
                            <span className="text-sm font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                {ofs.length} Disponible(s)
                            </span>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {ofs.map((of: any) => (
                                <div
                                    key={of.id}
                                    onClick={() => setSelectedOf(of)}
                                    className="group relative p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <BoxIcon className="w-16 h-16 text-blue-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase mb-1">Ordre de Fab.</div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-2">{of.numeroOF}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4 h-6">
                                            <span className="font-semibold">Ref:</span> {of.reference?.codeReference}
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                            <span className="text-xs text-gray-500">{new Date(of.createdAt).toLocaleDateString()}</span>
                                            <span className="text-xs font-bold text-gray-400 group-hover:text-blue-600 transition-colors">Ouvrir &rarr;</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {ofs.length === 0 && (
                            <div className="mt-12 text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                                <BoxIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 mb-6 text-lg">Aucun OF trouvé. Commencez par une simulation.</p>
                                <Button
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-none shadow-lg shadow-blue-500/30 px-8 py-3 rounded-xl font-medium transition-all transform active:scale-95"
                                    onClick={() => setSelectedOf({
                                        id: 'mock-1',
                                        numeroOF: 'OF-MOCK-001',
                                        reference: { codeReference: 'REF-TEST-123' },
                                        quantiteTotale: 100,
                                        createdAt: new Date().toISOString()
                                    })}
                                >
                                    Lancer OF de Test (Demo)
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-10">
            <PageMeta title="Scan Station | GALIA" description="Poste de Scannage" />

            {/* Premium Header */}
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
                                Poste: <span className="font-semibold text-indigo-600 dark:text-indigo-400">FSB2</span>
                            </div>
                        </div>
                    </div>

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

                    <Button
                        className="bg-white hover:bg-red-50 text-red-600 border border-transparent hover:border-red-200 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                        onClick={() => setSelectedOf(null)}
                    >
                        &larr; Changer OF
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                {/* Step 1 View: Basic Scan */}
                {currentStep === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px]">
                        {/* Premium Orange Box - Scan Focus */}
                        <div className="lg:col-span-5 relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                            <div className="relative h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col justify-between overflow-hidden border border-gray-700/50">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <BoxIcon className="w-64 h-64 text-white" />
                                </div>

                                {/* Feedback Overlays with Backdrop Blur */}
                                {scanError && (
                                    <div className="absolute inset-0 bg-red-600/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-300 text-white p-8 text-center rounded-2xl">
                                        <div className="bg-white/20 p-4 rounded-full mb-4 animate-bounce">
                                            <AlertIcon className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-black mb-2 tracking-tight">ERREUR DE SCAN</h2>
                                        <p className="text-lg opacity-90 max-w-xs mx-auto leading-relaxed">{scanError}</p>
                                        <Button className="mt-8 bg-white text-red-600 hover:bg-gray-100 border-none px-8 py-3 rounded-xl font-bold text-lg shadow-lg" onClick={() => setScanError("")}>
                                            Réessayer
                                        </Button>
                                    </div>
                                )}
                                {scanResult && (
                                    <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-300 text-white p-8 text-center rounded-2xl pointer-events-none fade-out-delay">
                                        <div className="bg-white/20 p-4 rounded-full mb-4 animate-pulse">
                                            <CheckCircleIcon className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-4xl font-black mb-2 tracking-tight">VALIDÉ</h2>
                                        <p className="text-xl opacity-90">Unité enregistrée avec succès</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-8 z-10">
                                    <button className="bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white font-medium py-2 px-4 rounded-lg border border-gray-600 transition-colors backdrop-blur-md">
                                        F1: Echape
                                    </button>
                                    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Temps</span>
                                        <span className="font-mono font-bold text-xl text-orange-400">00:00</span>
                                        <span className="text-xs font-bold text-gray-400">MIN</span>
                                    </div>
                                </div>

                                <form onSubmit={handleScanSubmit} className="space-y-6 flex-1 flex flex-col justify-center relative z-10 w-full">
                                    <div className="space-y-4">
                                        <FieldLabelInput
                                            label="Ref Client"
                                            name="reference"
                                            value={displayData.reference}
                                            onChange={handleDisplayChange}
                                            highlight
                                        />
                                        <FieldLabelInput
                                            label="Quantité"
                                            name="quantite"
                                            value={displayData.quantite}
                                            onChange={handleDisplayChange}
                                        />
                                        <FieldLabelInput
                                            label="N° OF"
                                            name="ofNum"
                                            value={displayData.ofNum}
                                            onChange={handleDisplayChange}
                                        />
                                    </div>

                                    <div className="mt-8 relative">
                                        <span className="absolute -top-3 left-0 text-xs font-bold text-orange-400 uppercase tracking-widest pl-1">Input Scanner</span>
                                        <div className="flex items-center gap-4">
                                            <div className="relative flex-1 group/input">
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg blur opacity-75 group-focus-within/input:opacity-100 transition duration-300"></div>
                                                <input
                                                    ref={inputRef}
                                                    value={scanValue}
                                                    onChange={handleRefHuChange}
                                                    className="relative w-full h-14 bg-gray-900 rounded-lg px-6 font-mono text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 border border-gray-700"
                                                    autoFocus
                                                    placeholder="Scanner HU..."
                                                    disabled={loading}
                                                />
                                            </div>
                                        </div>
                                        <p className="mt-3 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Scanner prêt
                                        </p>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Right Stats Panel */}
                        <div className="lg:col-span-7 flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 h-full">
                                <StatsPanel selectedOf={selectedOf} status={status} stats={stats} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 View: Complex Form */}
                {currentStep === 2 && (
                    <div className="grid grid-cols-12 gap-6 h-full min-h-[600px]">
                        {/* Left KPI Column */}
                        <div className="col-span-12 lg:col-span-3 space-y-4">
                            <KPICard title="Objectif" value="0" color="blue" />
                            <KPICard title="Production" value={stats.piecesScan} color="green" icon={<CheckCircleIcon className="w-6 h-6" />} />
                            <KPICard title="Ecart" value={`-${stats.piecesReste}`} color="red" icon={<AlertIcon className="w-6 h-6" />} />
                        </div>

                        {/* Main Content Area */}
                        <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
                            {/* Top Info (Compact) */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>
                                <StatsPanel selectedOf={selectedOf} status={status} stats={stats} compact />
                            </div>

                            {/* Bottom Form Section */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col flex-1 overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-gray-100 dark:border-gray-700">
                                    <button className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10">
                                        Scannage et remplissage
                                    </button>
                                    <button className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                                        Détail
                                    </button>
                                    <button className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                                        Non conforme
                                    </button>
                                </div>

                                <div className="p-8 flex-1 grid grid-cols-12 gap-8">
                                    {/* Form Fields */}
                                    <div className="col-span-12 lg:col-span-8 space-y-5">
                                        <div className="grid grid-cols-1 gap-4">
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

                                            <ModernInput name="machineBarcode" label="Code Barre Machine Airbag" placeholder="Scanner..." value={formValues.machineBarcode} onChange={handleFormChange} />
                                            <ModernInput name="planner" label="Planificateur Coiffe" placeholder="Saisir..." value={formValues.planner} onChange={handleFormChange} />
                                            <ModernInput name="programBarcode" label="Code Barre Programme Airbag" placeholder="Scanner..." value={formValues.programBarcode} onChange={handleFormChange} />
                                            <ModernInput name="qrCode" label="QR Code Airbag" placeholder="Scanner..." value={formValues.qrCode} onChange={handleFormChange} />
                                        </div>

                                        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                            <Button className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none px-6 py-3 rounded-xl font-bold">Annuler</Button>
                                            <Button className="bg-white text-gray-600 border-2 border-gray-200 hover:border-gray-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                                                <DocsIcon className="w-5 h-5" /> Imprimer
                                            </Button>
                                            <div className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center font-bold text-lg cursor-pointer hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] active:scale-95 py-3">
                                                <CheckCircleIcon className="w-6 h-6 mr-2" />
                                                VALIDER (OK)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Icons / Decor */}
                                    <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                                        <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">Statut du Poste</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <StatusIcon icon={<CheckCircleIcon className="w-8 h-8 text-emerald-500" />} label="Actif" />
                                                <StatusIcon icon={<FolderIcon className="w-8 h-8 text-blue-500" />} label="Dossier" />
                                                <StatusIcon icon={<DocsIcon className="w-8 h-8 text-purple-500" />} label="Docs" />
                                            </div>
                                        </div>
                                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800/20">
                                            <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-4 text-center">Alertes</h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                <StatusIcon icon={<BoxIcon className="w-8 h-8 text-orange-600" />} label="Stock" />
                                                <StatusIcon icon={<FileIcon className="w-8 h-8 text-orange-600" />} label="Rapport" />
                                                <StatusIcon icon={<AlertIcon className="w-8 h-8 text-red-500" />} label="Erreur" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
                .fade-out-delay {
                    animation: fadeOut 0.5s forwards;
                    animation-delay: 1.5s;
                }
                @keyframes fadeOut {
                    to { opacity: 0; pointer-events: none; }
                }
                /* Custom scrollbar for table */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent; 
                }
                ::-webkit-scrollbar-thumb {
                    background: #cbd5e1; 
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; 
                }
            `}</style>
        </div>
    );
}

// --- Hoisted Sub-components with Premium Design ---

function KPICard({ title, value, color, icon }: any) {
    const colors: any = {
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

            {/* Decor */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white opacity-20 blur-xl"></div>
        </div>
    );
}

function ModernInput({ name, label, value, onChange, placeholder }: any) {
    return (
        <div className="group">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block group-focus-within:text-indigo-600 transition-colors">{label}</label>
            <div className="relative">
                <input
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                    placeholder={placeholder}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-300">
                    <BoxIcon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

function StatusIcon({ icon, label }: any) {
    return (
        <div className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                {icon}
            </div>
            <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700 dark:text-gray-400 transition-colors">{label}</span>
        </div>
    );
}

function FieldLabelInput({ label, name, value, onChange, placeholder, highlight = false, readOnly = false }: any) {
    return (
        <div className="flex items-center gap-4 group">
            <span className={`w-28 text-right font-bold text-sm uppercase tracking-wider ${highlight ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'} transition-colors`}>{label}</span>
            <input
                name={name}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                placeholder={placeholder}
                className={`flex-1 h-12 rounded-lg px-4 font-mono text-lg font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all
                    ${highlight
                        ? 'bg-white/10 text-white border border-white/20 focus:bg-white/20 placeholder-white/30'
                        : 'bg-black/20 text-gray-200 border border-black/10 focus:bg-black/30 placeholder-gray-500'
                    }
                    ${readOnly ? 'cursor-not-allowed opacity-80' : ''}
                `}
            />
        </div>
    );
}



function StatsPanel({ selectedOf, status, stats, compact = false }: any) {
    return (
        <div className="flex flex-col h-full">
            <div className={`flex justify-between items-center ${compact ? 'mb-4 border-b border-gray-100 dark:border-gray-700 pb-4' : 'mb-8'}`}>
                <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-800 dark:text-white flex items-center gap-2`}>
                    {!compact && <span className="w-2 h-8 rounded-full bg-indigo-500 block"></span>}
                    Information HU
                </h2>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-600">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-white dark:ring-gray-800">NO</div>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">NOURA</span>
                </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-4' : 'gap-8'} mb-8`}>
                {/* Info Fields - Card Style */}
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <InfoRow label="Ref Client" value={selectedOf.reference?.codeReference} />
                    <InfoRow label="N° OF" value={selectedOf.numeroOF} />
                    <InfoRow label="Code Galia" value={selectedOf.reference?.codeReference} />
                </div>

                {/* Key Stats Boxes */}
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

            {/* Data Table */}
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

function InfoRow({ label, value }: any) {
    return (
        <div className="flex items-center justify-between border-b border-gray-200/50 last:border-0 pb-2 last:pb-0">
            <span className="font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{label}</span>
            <div className="font-mono text-sm font-bold text-gray-800 dark:text-white bg-white dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600 shadow-sm">{value || '-'}</div>
        </div>
    );
}

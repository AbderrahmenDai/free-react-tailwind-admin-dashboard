import { useRef, useState } from "react";
import api from "../../services/api";

interface HuPreview {
    numeroHU: string;
    idType: string;
    quantitePrevue: number;
    statut: string;
}

interface OfPreview {
    numeroOF: string;
    whN: string;
    pkgInstr: string;
    ob: string;
    objectKey: string;
    alreadyExists: boolean;
    hus: HuPreview[];
}

interface PreviewResult {
    success: boolean;
    totalLines: number;
    totalOFs: number;
    totalHUs: number;
    errors: string[];
    warnings: string[];
    previewData: OfPreview[];
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

type Step = "upload" | "preview" | "done";

export default function ImportOfModal({ onClose, onSuccess }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [expandedOf, setExpandedOf] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setError(""); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) { setFile(f); setError(""); }
    };

    const handlePreview = async () => {
        if (!file) { setError("Veuillez sélectionner un fichier Excel."); return; }
        setLoading(true); setError("");
        try {
            const form = new FormData();
            form.append("file", file);
            const { data } = await api.post<PreviewResult>("/import/of/preview", form, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setPreview(data);
            setStep("preview");
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(msg || "Erreur lors de l'analyse du fichier.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!preview?.previewData) return;
        setLoading(true); setError("");
        try {
            const { data } = await api.post("/import/of/confirm", { data: preview.previewData });
            setSuccess(data.message || "Import réussi !");
            setStep("done");
            onSuccess();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(msg || "Erreur lors de la confirmation.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get("/import/of/template", { responseType: "blob" });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement("a");
            a.href = url; a.download = "Modele_Import_OF.xlsx"; a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignore */ }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">📊</div>
                        <div>
                            <h2 className="font-black text-gray-900 dark:text-white text-lg">Import OF depuis Excel</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Fichier SAP — colonnes : OF, HU, IDType, WhN, Pkg instr…</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-0 px-6 pt-4 pb-2">
                    {(["upload", "preview", "done"] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === s ? "bg-emerald-500 text-white" : i < ["upload", "preview", "done"].indexOf(step) ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
                                <span>{i + 1}</span>
                                <span className="hidden sm:inline">{s === "upload" ? "Fichier" : s === "preview" ? "Aperçu" : "Terminé"}</span>
                            </div>
                            {i < 2 && <div className={`w-8 h-0.5 mx-1 ${i < ["upload", "preview", "done"].indexOf(step) ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`} />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* STEP 1 – UPLOAD */}
                    {step === "upload" && (
                        <>
                            {/* Drop zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={e => e.preventDefault()}
                                onClick={() => fileRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${file ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-gray-300 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5"}`}
                            >
                                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
                                <div className="text-4xl mb-3">{file ? "✅" : "📁"}</div>
                                {file ? (
                                    <>
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} Ko — cliquez pour changer</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-gray-700 dark:text-gray-300">Glissez votre fichier ici</p>
                                        <p className="text-xs text-gray-500 mt-1">ou cliquez pour parcourir — .xlsx ou .xls</p>
                                    </>
                                )}
                            </div>

                            {/* Template download */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <div>
                                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300">📥 Télécharger le modèle</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Colonnes exactes du format SAP (OF, HU, IDType, WhN…)</p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Télécharger
                                </button>
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800/30">{error}</p>}
                        </>
                    )}

                    {/* STEP 2 – PREVIEW */}
                    {step === "preview" && preview && (
                        <>
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: "Lignes lues", value: preview.totalLines, color: "gray" },
                                    { label: "OFs détectés", value: preview.totalOFs, color: "blue" },
                                    { label: "HUs à importer", value: preview.totalHUs, color: "emerald" },
                                ].map(s => (
                                    <div key={s.label} className={`p-4 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-900/20 border border-${s.color}-100 dark:border-${s.color}-800/30 text-center`}>
                                        <div className={`text-3xl font-black text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</div>
                                        <div className={`text-xs font-bold text-${s.color}-700 dark:text-${s.color}-300 uppercase tracking-wider mt-1`}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Errors */}
                            {preview.errors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-4">
                                    <p className="font-bold text-red-700 dark:text-red-400 mb-2">⛔ {preview.errors.length} erreur(s) bloquante(s)</p>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {preview.errors.map((e, i) => <li key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">• {e}</li>)}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {preview.warnings.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
                                    <p className="font-bold text-amber-700 dark:text-amber-400 mb-2">⚠️ {preview.warnings.length} avertissement(s)</p>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {preview.warnings.map((w, i) => <li key={i} className="text-xs text-amber-600 dark:text-amber-400 font-mono">• {w}</li>)}
                                    </ul>
                                </div>
                            )}

                            {/* OF List */}
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Aperçu des données</p>
                                {preview.previewData.map(of => (
                                    <div key={of.numeroOF} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setExpandedOf(expandedOf === of.numeroOF ? null : of.numeroOF)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="font-black font-mono text-gray-900 dark:text-white">OF {of.numeroOF}</span>
                                                {of.alreadyExists && (
                                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full font-bold">Existant</span>
                                                )}
                                                <span className="text-xs text-gray-500">{of.hus.length} HU(s)</span>
                                                {of.whN && <span className="text-xs text-blue-500 font-mono">WhN: {of.whN}</span>}
                                            </div>
                                            <span className="text-gray-400 text-sm">{expandedOf === of.numeroOF ? "▲" : "▼"}</span>
                                        </button>
                                        {expandedOf === of.numeroOF && of.hus.length > 0 && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-gray-100 dark:bg-gray-800/50">
                                                        <tr>
                                                            {["N° HU", "IDType", "Statut"].map(h => (
                                                                <th key={h} className="py-2 px-4 text-left font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                        {of.hus.map(hu => (
                                                            <tr key={hu.numeroHU} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                                <td className="py-2 px-4 font-mono text-gray-800 dark:text-gray-200">{hu.numeroHU}</td>
                                                                <td className="py-2 px-4 text-gray-600 dark:text-gray-400">{hu.idType}</td>
                                                                <td className="py-2 px-4"><span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-bold">A_SCANNER</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800/30">{error}</p>}
                        </>
                    )}

                    {/* STEP 3 – DONE */}
                    {step === "done" && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl">✅</div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{success}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Les OFs et HUs ont été importés avec succès dans la base de données.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <button
                        onClick={step === "upload" ? onClose : () => { setStep("upload"); setPreview(null); setError(""); }}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        {step === "upload" ? "Annuler" : "← Retour"}
                    </button>

                    <div className="flex gap-3">
                        {step === "upload" && (
                            <button
                                onClick={handlePreview}
                                disabled={!file || loading}
                                className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${file && !loading ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30" : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                            >
                                {loading ? "Analyse..." : "Analyser le fichier →"}
                            </button>
                        )}
                        {step === "preview" && preview?.errors.length === 0 && (
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                            >
                                {loading ? "Import en cours..." : `✓ Confirmer l'import (${preview.totalHUs} HUs)`}
                            </button>
                        )}
                        {step === "done" && (
                            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">
                                Fermer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

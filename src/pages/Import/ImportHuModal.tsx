import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Button from '../../components/ui/button/Button';
import { importApi } from '../../services/importService';
import { DownloadIcon } from '../../icons'; // Re-use download icon and rotate if needed

interface ImportHuModalProps {
    ofId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportHuModal({ ofId, onClose, onSuccess }: ImportHuModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
    const [previewData, setPreviewData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onDrop = (acceptedFiles: File[]) => {
        if (acceptedFiles?.length) setFile(acceptedFiles[0]);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        maxFiles: 1
    });

    const handleDownloadTemplate = () => {
        importApi.downloadTemplate();
    };

    const handlePreview = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const result = await importApi.previewImport(file, ofId);
            setPreviewData(result);
            setStep("preview");
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur d'analyse");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!previewData?.success) return; // Should not happen in UI logic but safety check
        setLoading(true);
        try {
            await importApi.confirmImport(previewData.previewData, ofId);
            setStep("success");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur d'import");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Importer des HU</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === "upload" && (
                        <div className="space-y-6">
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
                                    ${isDragActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'}
                                `}
                            >
                                <input {...getInputProps()} />
                                <DownloadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4 rotate-180" />
                                {file ? (
                                    <p className="text-lg text-brand-600 font-semibold">{file.name}</p>
                                ) : (
                                    <>
                                        <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">Glissez votre fichier Excel ici</p>
                                        <p className="text-sm text-gray-500 mt-2">ou cliquez pour sélectionner (.xlsx, .xls)</p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-300">Besoin du format ?</span>
                                <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
                                    Télécharger le modèle
                                </Button>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg dark:bg-red-900/20 dark:text-red-400">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === "preview" && previewData && (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold">Total Lignes</div>
                                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{previewData.totalLines}</div>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-xs text-green-600 dark:text-green-400 uppercase font-bold">Valides</div>
                                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">{previewData.validLines}</div>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-xs text-red-600 dark:text-red-400 uppercase font-bold">Erreurs</div>
                                    <div className="text-2xl font-bold text-red-800 dark:text-red-200">{previewData.errors.length}</div>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <div className="text-xs text-yellow-600 dark:text-yellow-400 uppercase font-bold">Avertissements</div>
                                    <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{previewData.warnings.length}</div>
                                </div>
                            </div>

                            {/* Global Stats / Warnings */}
                            {previewData.globalStats?.deviationPercent > 5 && (
                                <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg dark:bg-yellow-900/30 dark:text-yellow-300 border-l-4 border-yellow-500">
                                    ⚠️ Attention: Écart global de quantité important ({previewData.globalStats.deviationPercent.toFixed(2)}%)
                                </div>
                            )}

                            {/* Errors List */}
                            {previewData.errors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
                                    <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">Erreurs Bloquantes ({previewData.errors.length})</h4>
                                    <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
                                        {previewData.errors.map((err: string, i: number) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Valid Data Preview (Truncated) */}
                            {previewData.previewData.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">Aperçu ({Math.min(5, previewData.previewData.length)} premiers items)</h4>
                                    <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-800">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HU</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                                {previewData.previewData.slice(0, 5).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.numeroHU}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.quantitePrevue}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.commentaire}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-12">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Import Réussi !</h3>
                            <p className="mt-2 text-gray-500">Les HU ont été créés avec succès.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800">
                    {step !== "success" && (
                        <Button variant="outline" onClick={onClose} disabled={loading}>
                            Annuler
                        </Button>
                    )}

                    {step === "upload" && (
                        <Button onClick={handlePreview} disabled={!file || loading}>
                            {loading ? "Analyse..." : "Analyser le fichier"}
                        </Button>
                    )}

                    {step === "preview" && (
                        <Button onClick={handleConfirm} disabled={!previewData?.success || loading}>
                            {loading ? "Importation..." : "Confirmer l'import"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

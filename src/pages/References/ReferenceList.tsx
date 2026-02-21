import { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import { referenceApi, ReferenceProduit } from "../../services/referenceService";
import StepperModalContent from "./components/StepperModalContent";
import { PlusIcon, PencilIcon, TrashBinIcon, BoxCubeIcon } from "../../icons";

export default function ReferenceList() {
    const [references, setReferences] = useState<ReferenceProduit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRef, setEditingRef] = useState<ReferenceProduit | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<any | null>(null);
    const [importLoading, setImportLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        codeReference: "",
        designation: "",
        indice: "",
        referenceInterne: "",
        uniteMesure: "U",
        familleProduit: "",
        referenceClient: "",
        version: "",
        projet: "",
        referenceClientIndice: "",
        codeProjet: "",
        airbagProgramm: "",
        planificateurDeCode: "",
        partNumber: "",
        compteur: 0,
        shortDescriptionForLabel: "",
        orientation: "",
        tempsDeGamme: "",
        colisage: 0,
        descriptionProjet: "",
        couleurImpression: "Noir",
        refClientD2: "",
        refInterneD2: ""
    });

    useEffect(() => {
        loadReferences();
    }, []);

    const loadReferences = async () => {
        try {
            setLoading(true);
            const data = await referenceApi.getAllReferences();
            setReferences(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Filter and Pagination Logic
    const filteredReferences = references.filter(ref =>
        ref.codeReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.referenceClient?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredReferences.length / itemsPerPage);
    const paginatedReferences = filteredReferences.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleEdit = (ref: ReferenceProduit) => {
        setEditingRef(ref);
        setFormData({
            codeReference: ref.codeReference,
            designation: ref.designation,
            indice: ref.indice,
            referenceInterne: ref.referenceInterne || "",
            uniteMesure: ref.uniteMesure,
            familleProduit: ref.familleProduit || "",
            referenceClient: ref.referenceClient || "",
            version: ref.version || "",
            projet: ref.projet || "",
            referenceClientIndice: ref.referenceClientIndice || "",
            codeProjet: ref.codeProjet || "",
            airbagProgramm: ref.airbagProgramm || "",
            planificateurDeCode: ref.planificateurDeCode || "",
            partNumber: ref.partNumber || "",
            compteur: ref.compteur || 0,
            shortDescriptionForLabel: ref.shortDescriptionForLabel || "",
            orientation: ref.orientation || "",
            tempsDeGamme: ref.tempsDeGamme || "",
            colisage: ref.colisage || 0,
            descriptionProjet: ref.descriptionProjet || "",
            couleurImpression: ref.couleurImpression || "Noir",
            refClientD2: ref.refClientD2 || "",
            refInterneD2: ref.refInterneD2 || ""
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette référence ?")) {
            try {
                await referenceApi.deleteReference(id);
                loadReferences();
            } catch (e: any) {
                alert(e.response?.data?.message || "Erreur lors de la suppression");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRef) {
                await referenceApi.updateReference(editingRef.id, formData);
            } else {
                await referenceApi.createReference(formData);
            }
            setIsModalOpen(false);
            resetForm();
            loadReferences();
        } catch (e: any) {
            alert(e.response?.data?.message || "Erreur lors de l'enregistrement");
        }
    };

    const resetForm = () => {
        setEditingRef(null);
        setFormData({
            codeReference: "",
            designation: "",
            indice: "",
            referenceInterne: "",
            uniteMesure: "U",
            familleProduit: "",
            referenceClient: "",
            version: "",
            projet: "",
            referenceClientIndice: "",
            codeProjet: "",
            airbagProgramm: "",
            planificateurDeCode: "",
            partNumber: "",
            compteur: 0,
            shortDescriptionForLabel: "",
            orientation: "",
            tempsDeGamme: "",
            colisage: 0,
            descriptionProjet: "",
            couleurImpression: "Noir",
            refClientD2: "",
            refInterneD2: ""
        });
    };

    // Import Handlers
    const handleDownloadTemplate = async () => {
        try {
            const blob = await referenceApi.importTemplate();
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Modele_Import_References.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error("Template error", e);
            alert("Erreur lors du téléchargement du modèle");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImportFile(e.target.files[0]);
            setImportPreview(null);
        }
    };

    const handlePreviewImport = async () => {
        if (!importFile) return;
        setImportLoading(true);
        try {
            const result = await referenceApi.previewImport(importFile);
            setImportPreview(result);
        } catch (e: any) {
            alert(e.response?.data?.message || "Erreur lors de la prévisualisation");
        } finally {
            setImportLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!importPreview?.previewData) return;
        setImportLoading(true);
        try {
            await referenceApi.confirmImport(importPreview.previewData);
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportPreview(null);
            loadReferences();
            alert("Import réussi !");
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.message || "Erreur lors de l'import");
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <>
            <PageMeta
                title="Références | GALIA App"
                description="Gestion des références produits"
            />
            <PageBreadcrumb pageTitle="Références Produits" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Rechercher une référence..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="gap-2">
                            <BoxCubeIcon className="w-5 h-5" />
                            Import/Export
                        </Button>
                        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105">
                            <PlusIcon className="w-5 h-5" />
                            Nouvelle Référence
                        </Button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg run-ring-1 ring-black/5 overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Désignation</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Indice</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Famille</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Chargement des données...</td></tr>
                                ) : paginatedReferences.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucune référence trouvée</td></tr>
                                ) : (
                                    paginatedReferences.map((ref, index) => (
                                        <tr
                                            key={ref.id}
                                            className="hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-200 animate-[fadeInUp_0.3s_ease-out_forwards]"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{ref.codeReference}</span>
                                                    {ref.referenceClient && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{ref.referenceClient}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                                <div className="font-medium">{ref.designation}</div>
                                                <div className="text-xs text-gray-500">{ref.projet}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                    {ref.indice}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {ref.familleProduit}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => handleEdit(ref)}
                                                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                                                        title="Modifier"
                                                    >
                                                        <PencilIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(ref.id)}
                                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                                                        title="Supprimer"
                                                    >
                                                        <TrashBinIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredReferences.length)}</span> sur <span className="font-medium">{filteredReferences.length}</span> résultats
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    Précédent
                                </Button>
                                <div className="flex items-center gap-1 px-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Page {currentPage} / {totalPages}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    Suivant
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Generic Modal for Create/Edit (Stepper) */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
                        <div
                            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setIsModalOpen(false)}
                        ></div>

                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-8 transform transition-all scale-100 opacity-100 ring-1 ring-black/5 animate-[fadeInScale_0.3s_ease-out]">
                            <style>{`
                                @keyframes fadeInScale {
                                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                                    to { opacity: 1; transform: scale(1) translateY(0); }
                                }
                            `}</style>

                            <StepperModalContent
                                editingRef={editingRef}
                                formData={formData}
                                setFormData={setFormData}
                                onClose={() => setIsModalOpen(false)}
                                onSubmit={handleSubmit}
                            />
                        </div>
                    </div>
                )}

                {/* Import Modal */}
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Import Excel</h3>

                            {!importPreview ? (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">1. Téléchargez le modèle Excel</p>
                                        <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>Télécharger Modèle</Button>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">2. Chargez votre fichier rempli</p>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-gray-700 dark:file:text-white"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Annuler</Button>
                                        <Button disabled={!importFile || importLoading} onClick={handlePreviewImport}>
                                            {importLoading ? "Analyse..." : "Prévisualiser"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded">
                                        <div>
                                            <span className="font-bold">{importPreview.totalLines}</span> lignes trouvées,{" "}
                                            <span className="text-green-600 font-bold">{importPreview.validLines}</span> valides
                                        </div>
                                        {importPreview.errors.length > 0 && (
                                            <span className="text-red-600 font-bold">{importPreview.errors.length} erreurs</span>
                                        )}
                                    </div>

                                    {importPreview.errors.length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm text-red-600 dark:text-red-400 max-h-40 overflow-y-auto">
                                            <ul className="list-disc pl-5">
                                                {importPreview.errors.slice(0, 10).map((err: string, i: number) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {importPreview.errors.length > 10 && <li>...et {importPreview.errors.length - 10} autres erreurs</li>}
                                            </ul>
                                        </div>
                                    )}

                                    {importPreview.warnings.length > 0 && (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-sm text-yellow-600 dark:text-yellow-400 max-h-40 overflow-y-auto">
                                            <ul className="list-disc pl-5">
                                                {importPreview.warnings.slice(0, 5).map((warn: string, i: number) => (
                                                    <li key={i}>{warn}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button variant="outline" onClick={() => { setImportPreview(null); setImportFile(null); }}>Retour</Button>
                                        <Button
                                            disabled={!importPreview.success || importLoading}
                                            onClick={handleConfirmImport}
                                            className={!importPreview.success ? "opacity-50 cursor-not-allowed" : ""}
                                        >
                                            {importLoading ? "Import..." : "Confirmer l'import"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

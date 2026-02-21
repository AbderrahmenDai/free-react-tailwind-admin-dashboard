import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import InputField from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { ofApi } from "../../services/ofService";
import { huApi } from "../../services/huService";
import { referenceApi } from "../../services/referenceService";
import { PlusIcon, EyeIcon, BoxCubeIcon, PencilIcon, TrashBinIcon, DocsIcon } from "../../icons";
import { Link } from "react-router";
import TicketLabel from "../../components/print/TicketLabel";
import ImportOfModal from "../../components/modals/ImportOfModal";

export default function OfList() {
    const [ofs, setOfs] = useState<any[]>([]);
    const [references, setReferences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // OF Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportOfOpen, setIsImportOfOpen] = useState(false);
    const [editingOf, setEditingOf] = useState<any | null>(null);
    const [formData, setFormData] = useState({
        numeroOF: "",
        referenceId: "",
        quantiteTotale: 0,
        statut: "EN_COURS",
        whN: "",
        pkgInstr: "",
        ob: "",
        objectKey: ""
    });

    // Details/HU Modal State
    const [selectedOfDetails, setSelectedOfDetails] = useState<any | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // HU Form State
    const [isHuFormOpen, setIsHuFormOpen] = useState(false);
    const [editingHu, setEditingHu] = useState<any | null>(null);
    const [huFormData, setHuFormData] = useState({
        numeroHU: "",
        quantitePrevue: 0,
        statut: "A_SCANNER",
        idType: "E",
        createdUser: "System"
    });

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // HU Filter & Pagination State
    const [huSearchTerm, setHuSearchTerm] = useState("");
    const [huStatusFilter, setHuStatusFilter] = useState("ALL");
    const [huCurrentPage, setHuCurrentPage] = useState(1);
    const [huItemsPerPage] = useState(5);

    // Print Refs
    const printAllRef = useRef<HTMLDivElement>(null);
    const printSingleRef = useRef<HTMLDivElement>(null);
    const [printingHu, setPrintingHu] = useState<any | null>(null);

    // Print all HU labels for the selected OF
    const handlePrintAll = useReactToPrint({
        contentRef: printAllRef,
        documentTitle: `Etiquettes-OF-${selectedOfDetails?.numeroOF || ''}`,
    });

    // Print single HU label
    const handlePrintSingle = useReactToPrint({
        contentRef: printSingleRef,
        documentTitle: `Etiquette-HU-${printingHu?.numeroHU || ''}`,
        onAfterPrint: () => setPrintingHu(null),
    });

    const triggerPrintSingle = (hu: any) => {
        setPrintingHu(hu);
        // Small delay to let React render the single ticket before printing
        setTimeout(() => handlePrintSingle(), 150);
    };

    // Auto-Generate HUs State
    const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
    // nombreHUs = how many HUs (boxes) to create = how many labels to print
    const [nombreHUs, setNombreHUs] = useState(1);
    const [autoGenLoading, setAutoGenLoading] = useState(false);

    const autoGenerateHUs = async () => {
        if (!selectedOfDetails) return;
        const totalQty = selectedOfDetails.quantiteTotale || 0;
        const nbHUs = nombreHUs;
        if (nbHUs <= 0 || nbHUs > 500) {
            alert(`Nombre de HUs invalide (${nbHUs}). Maximum 500.`);
            return;
        }
        // Distribute total quantity evenly across HUs
        const qtyParHU = Math.ceil(totalQty / nbHUs);
        if (!confirm(`Cela va créer ${nbHUs} HU(s) et imprimer ${nbHUs} étiquette(s). Confirmer ?`)) return;

        setAutoGenLoading(true);
        try {
            const existingCount = selectedOfDetails.handlingUnits?.length || 0;
            let remaining = totalQty;
            for (let i = 0; i < nbHUs; i++) {
                const qty = Math.min(qtyParHU, remaining > 0 ? remaining : qtyParHU);
                remaining -= qty;
                const suffix = String(existingCount + i + 1).padStart(4, '0');
                const newHU = {
                    numeroHU: `${selectedOfDetails.numeroOF}-${suffix}`,
                    quantitePrevue: qty,
                    statut: 'A_SCANNER',
                    idType: 'E',
                    createdUser: 'System',
                    ordreFabricationId: selectedOfDetails.id,
                };
                await huApi.createHU(newHU);
            }
            await refreshDetails();
            setIsAutoGenOpen(false);
            // Print after generation
            setTimeout(() => handlePrintAll(), 300);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erreur lors de la génération des HUs');
        } finally {
            setAutoGenLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // ... (Data Loading and OF Management remain same) ...

    // Filter Logic & Pagination for HUs
    const getFilteredAndPaginatedHUs = () => {
        if (!selectedOfDetails || !selectedOfDetails.handlingUnits) return { paginatedHUs: [], totalPages: 0 };

        const filtered = selectedOfDetails.handlingUnits.filter((hu: any) => {
            const matchesSearch = hu.numeroHU.toLowerCase().includes(huSearchTerm.toLowerCase());
            const matchesStatus = huStatusFilter === "ALL" || hu.statut === huStatusFilter;
            return matchesSearch && matchesStatus;
        });

        const totalPages = Math.ceil(filtered.length / huItemsPerPage);
        const startIndex = (huCurrentPage - 1) * huItemsPerPage;
        const paginatedHUs = filtered.slice(startIndex, startIndex + huItemsPerPage);

        return { paginatedHUs, totalPages };
    };

    const { paginatedHUs, totalPages } = getFilteredAndPaginatedHUs();

    // ... (rest of functions) ...

    const loadData = async () => {
        try {
            const [ofsData, refsData] = await Promise.all([
                ofApi.getAllOFs(),
                referenceApi.getAllReferences()
            ]);
            setOfs(ofsData);
            setReferences(refsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- OF Management ---

    const handleCreateOF = () => {
        setEditingOf(null);
        setFormData({
            numeroOF: "",
            referenceId: "",
            quantiteTotale: 0,
            statut: "EN_COURS",
            whN: "",
            pkgInstr: "",
            ob: "",
            objectKey: ""
        });
        setIsModalOpen(true);
    };

    const handleEditOF = (of: any) => {
        setEditingOf(of);
        setFormData({
            numeroOF: of.numeroOF,
            referenceId: of.referenceId,
            quantiteTotale: of.quantiteTotale,
            statut: of.statut,
            whN: of.whN || "",
            pkgInstr: of.pkgInstr || "",
            ob: of.ob || "",
            objectKey: of.objectKey || ""
        });
        setIsModalOpen(true);
    };

    const handleDeleteOF = async (id: string) => {
        if (confirm("Voulez-vous vraiment supprimer cet OF ? Cela supprimera également tous les HUs associés.")) {
            try {
                await ofApi.deleteOF(id);
                loadData();
            } catch (e: any) {
                alert(e.response?.data?.message || "Erreur lors de la suppression");
            }
        }
    };

    const handleSubmitOF = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOf) {
                await ofApi.updateOF(editingOf.id, formData);
            } else {
                await ofApi.createOF(formData);
            }
            setIsModalOpen(false);
            loadData();
        } catch (e: any) {
            alert(e.response?.data?.message || "Erreur lors de l'enregistrement");
        }
    };

    // --- HU Management ---

    const handleViewDetails = async (ofId: string) => {
        try {
            const data = await ofApi.getOFById(ofId);
            setSelectedOfDetails(data);
            setIsDetailsModalOpen(true);
            setIsHuFormOpen(false); // Reset HU form
        } catch (e: any) {
            console.error(e);
            alert("Erreur lors du chargement des détails");
        }
    };

    const refreshDetails = async () => {
        if (selectedOfDetails) {
            const data = await ofApi.getOFById(selectedOfDetails.id);
            setSelectedOfDetails(data);
        }
    };

    const handleCreateHU = () => {
        if (!selectedOfDetails) return;
        setEditingHu(null);
        // Auto-generate number or leave blank? User asked to "add/delete/modify". 
        // Let's suggest next number based on count + random to avoid collision for now
        const nextNum = (800000000 + Math.floor(Math.random() * 100000)).toString();

        setHuFormData({
            numeroHU: nextNum, // Pre-fill suggestion
            quantitePrevue: 10, // Default
            statut: "A_SCANNER",
            idType: "E",
            createdUser: "System"
        });
        setIsHuFormOpen(true);
    };

    const handleEditHU = (hu: any) => {
        setEditingHu(hu);
        setHuFormData({
            numeroHU: hu.numeroHU,
            quantitePrevue: hu.quantitePrevue,
            statut: hu.statut,
            idType: hu.idType || "E",
            createdUser: hu.createdUser || "System"
        });
        setIsHuFormOpen(true);
    };

    const handleDeleteHU = async (id: string) => {
        if (confirm("Supprimer ce HU ?")) {
            try {
                await huApi.deleteHU(id);
                refreshDetails();
            } catch (e: any) {
                alert("Erreur lors de la suppression du HU");
            }
        }
    };

    const handleSaveHU = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOfDetails) return;

        try {
            const payload = {
                ...huFormData,
                ordreFabricationId: selectedOfDetails.id
            };

            if (editingHu) {
                await huApi.updateHU(editingHu.id, payload);
            } else {
                await huApi.createHU(payload);
            }
            setIsHuFormOpen(false);
            refreshDetails();
        } catch (e: any) {
            alert(e.response?.data?.message || "Erreur lors de l'enregistrement du HU");
        }
    };

    // Filter Logic
    const filteredOfs = ofs.filter(of => {
        const matchesSearch =
            of.numeroOF.toLowerCase().includes(searchTerm.toLowerCase()) ||
            of.objectKey?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            of.reference?.codeReference.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || of.statut === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // ... (rest of functions) ...

    return (
        <>
            <PageMeta
                title="Ordres de Fabrication | GALIA App"
                description="Gestion des OFs"
            />
            <PageBreadcrumb pageTitle="Ordres de Fabrication" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Rechercher OF, Ref, Key..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-64"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-4 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="ALL">Tous les statuts</option>
                            <option value="EN_COURS">EN_COURS</option>
                            <option value="TERMINE">TERMINE</option>
                            <option value="ANNULE">ANNULE</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setIsImportOfOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        <span>📊</span> Importer Excel
                    </button>
                    <Button onClick={handleCreateOF} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Nvel Ordre de Fab.
                    </Button>
                </div>

                {/* Import OF Modal */}
                {isImportOfOpen && (
                    <ImportOfModal
                        onClose={() => setIsImportOfOpen(false)}
                        onSuccess={() => { setIsImportOfOpen(false); loadData(); }}
                    />
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° OF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhN</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pkg Instr.</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ob</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-4 text-center">Chargement...</td></tr>
                                ) : filteredOfs.length === 0 ? (
                                    <tr><td colSpan={8} className="p-4 text-center">Aucun OF trouvé</td></tr>
                                ) : (
                                    filteredOfs.map((of) => (
                                        <tr key={of.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600 dark:text-brand-400">
                                                {of.numeroOF}
                                                <div className="text-xs text-gray-400 font-normal">{of.objectKey}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {of.reference ? (
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">
                                                            {of.reference.referenceClient || "Réf Client manquante"}
                                                            {of.reference.referenceClientIndice && <span className="text-gray-400 font-normal ml-1">({of.reference.referenceClientIndice})</span>}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Int: {of.reference.codeReference} {of.reference.indice && `(${of.reference.indice})`}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-tight leading-tight">Liaison manquante</div>
                                                        <div className="text-xs text-gray-400 font-mono">
                                                            {of.pkgInstr || "Sans Pkg Instr"}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{of.whN}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{of.pkgInstr}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{of.ob}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                {of.quantiteTotale}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${of.statut === 'EN_COURS' ? 'bg-green-100 text-green-800' :
                                                        of.statut === 'TERMINE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {of.statut}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                                <button onClick={() => handleViewDetails(of.id)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1" title="Voir les HUs">
                                                    <BoxCubeIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleEditOF(of)} className="text-gray-500 hover:text-brand-600 dark:text-gray-400 p-1" title="Modifier">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteOF(of.id)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 p-1" title="Supprimer">
                                                    <TrashBinIcon className="w-5 h-5" />
                                                </button>
                                                <Link to={`/scan?of=${of.id}`} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 ml-2 inline-flex items-center gap-1" title="Scanner">
                                                    <EyeIcon className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create/Edit OF Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                                {editingOf ? "Modifier l'Ordre de Fabrication" : "Nouvel Ordre de Fabrication"}
                            </h3>
                            <form onSubmit={handleSubmitOF} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Numéro OF</Label>
                                        <InputField type="text" value={formData.numeroOF} onChange={(e) => setFormData({ ...formData, numeroOF: e.target.value })} required placeholder="OF-2024-XXXX" />
                                    </div>
                                    <div>
                                        <Label>Object Key / ID</Label>
                                        <InputField type="text" value={formData.objectKey} onChange={(e) => setFormData({ ...formData, objectKey: e.target.value })} placeholder="00000..." />
                                    </div>
                                </div>

                                <div>
                                    <Label>Référence Produit</Label>
                                    <select
                                        className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        value={formData.referenceId}
                                        onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                                        required
                                    >
                                        <option value="">Sélectionner une référence</option>
                                        {references.map(ref => (
                                            <option key={ref.id} value={ref.id}>
                                                {ref.codeReference} (Ind: {ref.indice}) - {ref.designation}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label>WhN</Label>
                                        <InputField type="text" value={formData.whN} onChange={(e) => setFormData({ ...formData, whN: e.target.value })} placeholder="35C" />
                                    </div>
                                    <div>
                                        <Label>Pkg Instr.</Label>
                                        <InputField type="text" value={formData.pkgInstr} onChange={(e) => setFormData({ ...formData, pkgInstr: e.target.value })} placeholder="Z35..." />
                                    </div>
                                    <div>
                                        <Label>Ob</Label>
                                        <InputField type="text" value={formData.ob} onChange={(e) => setFormData({ ...formData, ob: e.target.value })} placeholder="09" />
                                    </div>
                                </div>

                                <div>
                                    <Label>Quantité Totale à Produire</Label>
                                    <InputField type="number" min="1" value={formData.quantiteTotale} onChange={(e) => setFormData({ ...formData, quantiteTotale: parseInt(e.target.value) })} required />
                                </div>

                                {editingOf && (
                                    <div>
                                        <Label>Statut</Label>
                                        <select
                                            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                            value={formData.statut}
                                            onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                                        >
                                            <option value="EN_COURS">EN_COURS</option>
                                            <option value="TERMINE">TERMINE</option>
                                            <option value="ANNULE">ANNULE</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                                    <Button type="submit">{editingOf ? "Mettre à jour" : "Créer l'OF"}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Details (HUs) Modal */}
                {isDetailsModalOpen && selectedOfDetails && (
                    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full p-6 max-h-[95vh] overflow-y-auto ${isHuFormOpen ? "max-w-6xl" : "max-w-4xl"}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <BoxCubeIcon className="w-6 h-6 text-brand-600" />
                                        Détails OF: {selectedOfDetails.numeroOF}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Ref: {selectedOfDetails.reference?.codeReference} - {selectedOfDetails.reference?.designation}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Auto-Generate Button */}
                                    <button
                                        onClick={() => setIsAutoGenOpen(v => !v)}
                                        title="Auto-générer les HUs et imprimer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-semibold transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Auto-générer HUs
                                    </button>
                                    <button
                                        onClick={() => handlePrintAll()}
                                        title="Imprimer toutes les étiquettes HU"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm font-semibold transition-colors"
                                    >
                                        <DocsIcon className="w-4 h-4" />
                                        Toutes les étiquettes ({selectedOfDetails.handlingUnits?.reduce((sum: number, h: any) => sum + (Number(h.quantitePrevue) || 0), 0) || 0})
                                    </button>
                                    <Button size="sm" onClick={handleCreateHU} className="gap-2">
                                        <PlusIcon className="w-4 h-4" /> Ajouter HU
                                    </Button>
                                    <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Auto-Generate HUs Panel */}
                            {isAutoGenOpen && (
                                <div className="mb-6 p-5 rounded-xl border-2 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 text-base">🏭 Auto-générer les HUs</h4>
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                Quantité totale OF: <strong>{selectedOfDetails.quantiteTotale}</strong> pièces
                                            </p>
                                        </div>
                                        <button onClick={() => setIsAutoGenOpen(false)} className="text-indigo-400 hover:text-indigo-700">✕</button>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Nombre de HUs (étiquettes)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="500"
                                                value={nombreHUs}
                                                onChange={e => setNombreHUs(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-lg font-mono font-bold text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200">
                                            <div className="flex gap-6">
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">HUs à créer</div>
                                                    <div className="text-2xl font-black text-indigo-600">{nombreHUs}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Étiquettes</div>
                                                    <div className="text-2xl font-black text-emerald-600">{nombreHUs}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Pièces/HU</div>
                                                    <div className="text-2xl font-black text-gray-700">{Math.ceil((selectedOfDetails.quantiteTotale || 0) / nombreHUs)}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={autoGenerateHUs}
                                            disabled={autoGenLoading}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {autoGenLoading ? (
                                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            ) : (
                                                <DocsIcon className="w-4 h-4" />
                                            )}
                                            {autoGenLoading ? 'Génération...' : 'Générer & Imprimer'}
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-indigo-500">
                                        💡 Crée <strong>{nombreHUs} HU(s)</strong> et imprime <strong>{nombreHUs} étiquette(s)</strong>. Chaque HU contiendra ~{Math.ceil((selectedOfDetails.quantiteTotale || 0) / nombreHUs)} pièce(s).
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left Side: HU List */}
                                <div className={`flex-1 transition-all ${isHuFormOpen ? "w-2/3" : "w-full"}`}>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                                        {/* Same OF Details Grid */}
                                        <div><span className="block text-xs text-gray-500 uppercase">WhN</span><span className="font-semibold text-gray-900 dark:text-white">{selectedOfDetails.whN || "-"}</span></div>
                                        <div><span className="block text-xs text-gray-500 uppercase">Pkg Instr.</span><span className="font-semibold text-gray-900 dark:text-white">{selectedOfDetails.pkgInstr || "-"}</span></div>
                                        <div><span className="block text-xs text-gray-500 uppercase">Ob</span><span className="font-semibold text-gray-900 dark:text-white">{selectedOfDetails.ob || "-"}</span></div>
                                        <div><span className="block text-xs text-gray-500 uppercase">Key</span><span className="font-mono text-sm text-gray-900 dark:text-white">{selectedOfDetails.objectKey || "-"}</span></div>
                                    </div>

                                    <div className="flex flex-col gap-4 mb-4">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                placeholder="Rechercher HU..."
                                                value={huSearchTerm}
                                                onChange={(e) => { setHuSearchTerm(e.target.value); setHuCurrentPage(1); }}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
                                            />
                                            <select
                                                value={huStatusFilter}
                                                onChange={(e) => { setHuStatusFilter(e.target.value); setHuCurrentPage(1); }}
                                                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            >
                                                <option value="ALL">Tous les statuts</option>
                                                <option value="A_SCANNER">A_SCANNER</option>
                                                <option value="SCANNE">SCANNE</option>
                                                <option value="VALIDE">VALIDE</option>
                                                <option value="REJETE">REJETE</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HU</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDType</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                                {paginatedHUs.length > 0 ? (
                                                    paginatedHUs.map((hu: any) => (
                                                        <tr key={hu.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-brand-600 dark:text-brand-400">{hu.numeroHU}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-mono">{hu.quantitePrevue}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{hu.idType}</td>
                                                            <td className="px-4 py-2 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                                    ${hu.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                                                                        hu.statut === 'SCANNE' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    {hu.statut}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                                <button
                                                                    onClick={() => triggerPrintSingle(hu)}
                                                                    title="Imprimer l'étiquette"
                                                                    className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1"
                                                                >
                                                                    <DocsIcon className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleEditHU(hu)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 p-1"><PencilIcon className="w-4 h-4" /></button>
                                                                <button onClick={() => handleDeleteHU(hu.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 p-1 ml-1"><TrashBinIcon className="w-4 h-4" /></button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500 text-sm">Aucun HU trouvé</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {totalPages > 1 && (
                                        <div className="flex justify-between items-center mt-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={huCurrentPage === 1}
                                                onClick={() => setHuCurrentPage(p => Math.max(1, p - 1))}
                                            >
                                                Précédent
                                            </Button>
                                            <span className="text-sm text-gray-500">
                                                Page {huCurrentPage} sur {totalPages}
                                            </span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={huCurrentPage === totalPages}
                                                onClick={() => setHuCurrentPage(p => Math.min(totalPages, p + 1))}
                                            >
                                                Suivant
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: HU Form */}
                                {isHuFormOpen && (
                                    <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
                                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">
                                            {editingHu ? "Modifier HU" : "Ajouter HU"}
                                        </h4>
                                        <form onSubmit={handleSaveHU} className="space-y-3">
                                            <div>
                                                <Label>Numéro HU</Label>
                                                <InputField type="text" value={huFormData.numeroHU} onChange={(e) => setHuFormData({ ...huFormData, numeroHU: e.target.value })} required />
                                            </div>
                                            <div>
                                                <Label>Quantité</Label>
                                                <InputField type="number" value={huFormData.quantitePrevue} onChange={(e) => setHuFormData({ ...huFormData, quantitePrevue: parseFloat(e.target.value) })} required />
                                            </div>
                                            <div>
                                                <Label>ID Type</Label>
                                                <InputField type="text" value={huFormData.idType} onChange={(e) => setHuFormData({ ...huFormData, idType: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label>Statut</Label>
                                                <select
                                                    className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                                    value={huFormData.statut}
                                                    onChange={(e) => setHuFormData({ ...huFormData, statut: e.target.value })}
                                                >
                                                    <option value="A_SCANNER">A_SCANNER</option>
                                                    <option value="SCANNE">SCANNE</option>
                                                    <option value="VALIDE">VALIDE</option>
                                                    <option value="REJETE">REJETE</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button type="button" size="sm" variant="outline" onClick={() => setIsHuFormOpen(false)}>Annuler</Button>
                                                <Button type="submit" size="sm">Enregistrer</Button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ───── Hidden: ALL labels for bulk print ───── */}
                {/* One unique label per HU — the barcode counter (compteurHU) ensures uniqueness */}
                {isDetailsModalOpen && selectedOfDetails && (
                    <div className="hidden">
                        <div ref={printAllRef}>
                            {selectedOfDetails?.handlingUnits?.map((hu: any, huIdx: number) => (
                                <div
                                    key={hu.id}
                                    style={{ pageBreakAfter: huIdx < (selectedOfDetails.handlingUnits.length - 1) ? 'always' : 'auto' }}
                                >
                                    <TicketLabel
                                        of={selectedOfDetails}
                                        hu={hu}
                                        reference={selectedOfDetails.reference || {}}
                                        index={huIdx + 1}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ───── Hidden: SINGLE HU print — one unique label per HU ───── */}
                {printingHu && selectedOfDetails && (
                    <div className="hidden">
                        <div ref={printSingleRef}>
                            <TicketLabel
                                of={selectedOfDetails}
                                hu={printingHu}
                                reference={selectedOfDetails.reference || {}}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

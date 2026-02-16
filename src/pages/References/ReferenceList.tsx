import { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import InputField from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { referenceApi, ReferenceProduit } from "../../services/referenceService";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";

export default function ReferenceList() {
    const [references, setReferences] = useState<ReferenceProduit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRef, setEditingRef] = useState<ReferenceProduit | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        codeReference: "",
        designation: "",
        indice: "",
        referenceInterne: "",
        uniteMesure: "U",
        familleProduit: ""
    });

    useEffect(() => {
        loadReferences();
    }, []);

    const loadReferences = async () => {
        try {
            const data = await referenceApi.getAllReferences();
            setReferences(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (ref: ReferenceProduit) => {
        setEditingRef(ref);
        setFormData({
            codeReference: ref.codeReference,
            designation: ref.designation,
            indice: ref.indice,
            referenceInterne: ref.referenceInterne || "",
            uniteMesure: ref.uniteMesure,
            familleProduit: ref.familleProduit || ""
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
            familleProduit: ""
        });
    };

    return (
        <>
            <PageMeta
                title="Références | GALIA App"
                description="Gestion des références produits"
            />
            <PageBreadcrumb pageTitle="Références Produits" />

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Nouvelle Référence
                    </Button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Désignation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indice</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Chargement...</td></tr>
                                ) : references.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Aucune référence trouvée</td></tr>
                                ) : (
                                    references.map((ref) => (
                                        <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {ref.codeReference}
                                                {ref.referenceInterne && <span className="block text-xs text-gray-500">Int: {ref.referenceInterne}</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ref.designation}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ref.indice}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ref.uniteMesure}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(ref)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(ref.id)} className="text-red-600 hover:text-red-900 dark:text-red-400"><TrashBinIcon className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Generic Modal for Create/Edit */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                                {editingRef ? "Modifier Référence" : "Nouvelle Référence"}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Code Référence</Label>
                                        <InputField type="text" value={formData.codeReference} onChange={(e) => setFormData({ ...formData, codeReference: e.target.value })} required />
                                    </div>
                                    <div>
                                        <Label>Indice</Label>
                                        <InputField type="text" value={formData.indice} onChange={(e) => setFormData({ ...formData, indice: e.target.value })} required />
                                    </div>
                                </div>
                                <div>
                                    <Label>Désignation</Label>
                                    <InputField type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Ref. Interne (Opt)</Label>
                                        <InputField type="text" value={formData.referenceInterne} onChange={(e) => setFormData({ ...formData, referenceInterne: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Unité</Label>
                                        <select
                                            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                            value={formData.uniteMesure}
                                            onChange={(e) => setFormData({ ...formData, uniteMesure: e.target.value })}
                                        >
                                            <option value="U">Unité (U)</option>
                                            <option value="KG">Kilogramme (KG)</option>
                                            <option value="M">Mètre (M)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                                    <Button type="submit">{editingRef ? "Mettre à jour" : "Créer"}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

import { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import InputField from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { ofApi } from "../../services/ofService";
import { referenceApi } from "../../services/referenceService";
import { PlusIcon, EyeIcon } from "../../icons";
import { Link } from "react-router"; // Use Link to navigate to details/scan if needed

export default function OfList() {
    const [ofs, setOfs] = useState<any[]>([]);
    const [references, setReferences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        numeroOF: "",
        referenceId: "",
        quantiteTotale: 0,
        statut: "EN_COURS"
    });

    useEffect(() => {
        loadData();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ofApi.createOF(formData);
            setIsModalOpen(false);
            setFormData({ numeroOF: "", referenceId: "", quantiteTotale: 0, statut: "EN_COURS" });
            const data = await ofApi.getAllOFs();
            setOfs(data);
        } catch (e: any) {
            alert(e.response?.data?.message || "Erreur lors de la création");
        }
    };

    return (
        <>
            <PageMeta
                title="Ordres de Fabrication | GALIA App"
                description="Gestion des OFs"
            />
            <PageBreadcrumb pageTitle="Ordres de Fabrication" />

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Nvel Ordre de Fab.
                    </Button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° OF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qté Totale</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-4 text-center">Chargement...</td></tr>
                                ) : ofs.length === 0 ? (
                                    <tr><td colSpan={6} className="p-4 text-center">Aucun OF trouvé</td></tr>
                                ) : (
                                    ofs.map((of) => (
                                        <tr key={of.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-600 dark:text-brand-400">
                                                {of.numeroOF}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                {of.reference?.codeReference} <span className="text-xs text-gray-500">({of.reference?.indice})</span>
                                            </td>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(of.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/scan?of=${of.id}`} className="text-brand-600 hover:text-brand-900 dark:text-brand-400 mr-3 inline-flex items-center gap-1">
                                                    <EyeIcon className="w-4 h-4" /> Scanner
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Nouvel Ordre de Fabrication</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label>Numéro OF</Label>
                                    <InputField type="text" value={formData.numeroOF} onChange={(e) => setFormData({ ...formData, numeroOF: e.target.value })} required placeholder="OF-2024-XXXX" />
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

                                <div>
                                    <Label>Quantité Totale à Produire</Label>
                                    <InputField type="number" min="1" value={formData.quantiteTotale} onChange={(e) => setFormData({ ...formData, quantiteTotale: parseInt(e.target.value) })} required />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                                    <Button type="submit">Créer l'OF</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

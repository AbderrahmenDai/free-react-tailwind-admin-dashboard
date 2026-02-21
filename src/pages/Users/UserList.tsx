
import { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import InputField from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { userApi, User } from "../../services/userService";
import { PlusIcon, PencilIcon, TrashBinIcon, UserIcon } from "../../icons";
import Select from "../../components/form/Select";

export default function UserList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "AGENT_TICKET",
        isActive: true
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await userApi.getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: "", // Don't fill password on edit
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
            try {
                await userApi.deleteUser(id);
                loadUsers();
            } catch (e: any) {
                alert(e.response?.data?.message || "Erreur lors de la suppression");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password;
                await userApi.updateUser(editingUser.id, updateData);
            } else {
                await userApi.createUser(formData as any);
            }
            setIsModalOpen(false);
            resetForm();
            loadUsers();
        } catch (e: any) {
            console.error("Error saving user:", e);
            const message = e.response?.data?.message || "Erreur lors de l'enregistrement";
            const errorDetails = e.response?.data?.error;
            alert(`${message}${errorDetails ? ": " + errorDetails : ""}`);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({
            username: "",
            email: "",
            password: "",
            firstName: "",
            lastName: "",
            role: "AGENT_TICKET",
            isActive: true
        });
    };

    const roleOptions = [
        { value: "ADMIN", label: "Admin" },
        { value: "METHODE", label: "Méthode" },
        { value: "SUPERVISEUR", label: "Superviseur" },
        { value: "AGENT_CONTROLE", label: "Agent Contrôle" },
        { value: "AGENT_TICKET", label: "Agent Ticket" },
    ];

    return (
        <>
            <PageMeta
                title="Utilisateurs | GALIA App"
                description="Gestion des utilisateurs et rôles"
            />
            <PageBreadcrumb pageTitle="Gestion des Utilisateurs" />

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Nouvel Utilisateur
                    </Button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Chargement...</td></tr>
                                ) : users.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Aucun utilisateur trouvé</td></tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                                            <UserIcon className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</div>
                                                        <div className="text-sm text-gray-500">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                                                    {user.isActive ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400"><PencilIcon className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400"><TrashBinIcon className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6">
                            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                                {editingUser ? "Modifier Utilisateur" : "Nouvel Utilisateur"}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Prénom</Label>
                                        <InputField type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                                    </div>
                                    <div>
                                        <Label>Nom</Label>
                                        <InputField type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Utilisateur (Username)</Label>
                                        <InputField type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                                    </div>
                                    <div>
                                        <Label>Email</Label>
                                        <InputField type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                </div>

                                <div>
                                    <Label>Mot de passe {editingUser && "(Laisser vide pour ne pas changer)"}</Label>
                                    <InputField type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                                </div>

                                <div>
                                    <Label>Rôle</Label>
                                    <Select
                                        options={roleOptions}
                                        value={formData.role}
                                        placeholder="Sélectionner un rôle"
                                        onChange={(value) => setFormData({ ...formData, role: value as any })}
                                        className="dark:bg-dark-900"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                                    <Button type="submit">{editingUser ? "Mettre à jour" : "Créer"}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

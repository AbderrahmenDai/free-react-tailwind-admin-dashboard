import React, { useState, useEffect } from 'react';
import PageMeta from '../../components/common/PageMeta';
import { BoxCubeIcon, GridIcon } from '../../icons';
import RealTimeProductionChart from './components/RealTimeProductionChart';
import ObjectiveChart from './components/ObjectiveChart';
import LineTypePerformanceChart from './components/LineTypePerformanceChart';
import Button from '../../components/ui/button/Button';
import LineModal from './components/ui/LineModal';

// --- Types ---

type LineStatus = 'active' | 'maintenance' | 'stopped';

interface ProductionLine {
    id: string;
    code: string;
    nom: string;
    type: string;
    statut: LineStatus;
    efficacite: number;
    cadence?: number;
    objectif?: number;
}

// --- Constants ---

const statusColors: Record<LineStatus, string> = {
    active: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    stopped: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

const statusLabels: Record<LineStatus, string> = {
    active: 'En Production',
    maintenance: 'Maintenance',
    stopped: 'Arrêt',
};

export default function ProductionLinesPage() {
    const [lines, setLines] = useState<ProductionLine[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLine, setCurrentLine] = useState<ProductionLine | null>(null);

    const fetchLines = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/lines');
            const data = await response.json();
            setLines(data);
        } catch (error) {
            console.error('Error fetching lines:', error);
        }
    };

    useEffect(() => {
        fetchLines();
    }, []);

    const handleSave = async (formData: any) => {
        try {
            const url = currentLine
                ? `http://localhost:5000/api/lines/${currentLine.id}`
                : 'http://localhost:5000/api/lines';

            const method = currentLine ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                fetchLines();
                setIsModalOpen(false);
                setCurrentLine(null);
            }
        } catch (error) {
            console.error('Error saving line:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) return;

        try {
            const response = await fetch(`http://localhost:5000/api/lines/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchLines();
                if (currentLine?.id === id) {
                    setIsModalOpen(false);
                    setCurrentLine(null);
                }
            }
        } catch (error) {
            console.error('Error deleting line:', error);
        }
    };

    const openModal = (line: ProductionLine | null = null) => {
        setCurrentLine(line);
        setIsModalOpen(true);
    };

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredLines = lines.filter(line => {
        const matchesSearch = line.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            line.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || line.type === typeFilter;
        const matchesStatus = statusFilter === "all" || line.statut === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const uniqueTypes = Array.from(new Set(lines.map(l => l.type))).sort();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-10">
            <PageMeta
                title="Production Lines"
                description="Manage and monitor production lines performance in real-time."
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <BoxCubeIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            Lignes de Production
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Suivi en temps réel de la performance des lignes
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="primary" onClick={() => openModal()} className="flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                            <GridIcon className="w-4 h-4" />
                            Nouvelle Ligne
                        </Button>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Main Performance Chart */}
                    <div className="col-span-12 xl:col-span-8">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <RealTimeProductionChart />
                        </div>
                    </div>

                    {/* Secondary Metrics / Objectives */}
                    <div className="col-span-12 xl:col-span-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-full">
                            <ObjectiveChart />
                        </div>
                    </div>
                </div>

                {/* Line Type Performance Chart */}
                <div className="grid grid-cols-1 gap-6">
                    <LineTypePerformanceChart />
                </div>

                {/* Status of Lines & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">État des Lignes</h2>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <select
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">Tous les types</option>
                            {uniqueTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tous status</option>
                            <option value="active">En Production</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="stopped">Arrêt</option>
                        </select>
                    </div>
                </div>

                {/* Line Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredLines.map((line) => (
                        <div
                            key={line.id}
                            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md dark:bg-gray-800 dark:ring-gray-700"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColors[line.statut]}`}>
                                    {statusLabels[line.statut]}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(line)} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDelete(line.id)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{line.nom}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Code: {line.code} • Type: {line.type}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-500 dark:text-gray-400">Efficacité</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{line.efficacite}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                                        <div
                                            className={`h-2 rounded-full transition-all ${line.efficacite >= 85 ? 'bg-green-500' :
                                                line.efficacite >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${line.efficacite}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Cadence</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{line.cadence || 0} p/h</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Objectif</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{line.objectif || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <LineModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                line={currentLine}
            />
        </div>
    );
}

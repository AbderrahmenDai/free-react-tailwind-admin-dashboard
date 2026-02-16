import React from 'react';
import PageMeta from '../../components/common/PageMeta';
import { BoxCubeIcon, GridIcon } from '../../icons';
import RealTimeProductionChart from './components/RealTimeProductionChart';
import ObjectiveChart from './components/ObjectiveChart';

type LineStatus = 'active' | 'maintenance' | 'stopped';

interface ProductionLine {
    id: string;
    name: string;
    type: string;
    status: LineStatus;
    efficiency: number;
}

const lines: ProductionLine[] = [
    // FSB Lines
    { id: 'fsb1', name: 'FSB 1', type: 'FSB', status: 'active', efficiency: 92 },
    { id: 'fsb2', name: 'FSB 2', type: 'FSB', status: 'active', efficiency: 88 },
    { id: 'fsb3', name: 'FSB 3', type: 'FSB', status: 'maintenance', efficiency: 0 },
    { id: 'fsb4', name: 'FSB 4', type: 'FSB', status: 'active', efficiency: 95 },
    { id: 'fsb5', name: 'FSB 5', type: 'FSB', status: 'stopped', efficiency: 0 },
    // RSC Lines
    { id: 'rsc1', name: 'RSC 1', type: 'RSC', status: 'active', efficiency: 85 },
    { id: 'rsc2', name: 'RSC 2', type: 'RSC', status: 'active', efficiency: 89 },
    { id: 'rsc3', name: 'RSC 3', type: 'RSC', status: 'active', efficiency: 91 },
    // RSB Lines
    { id: 'rsb1', name: 'RSB 1', type: 'RSB', status: 'active', efficiency: 87 },
    { id: 'rsb2', name: 'RSB 2', type: 'RSB', status: 'active', efficiency: 84 }, // Assumed RSB2 based on RSB1 RSB1
    // FSC Lines
    { id: 'fsc1', name: 'FSC 1', type: 'FSC', status: 'active', efficiency: 93 },
    { id: 'fsc2', name: 'FSC 2', type: 'FSC', status: 'active', efficiency: 90 },
];

const statusColors: any = {
    active: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    stopped: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

const statusLabels: any = {
    active: 'En Production',
    maintenance: 'Maintenance',
    stopped: 'Arrêt',
};

export default function ProductionLinesPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-10">
            <PageMeta title="Lignes de Production | GALIA" description="Vue d'ensemble des lignes de production" />

            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-8 shadow-sm mb-8">
                {/* ... (header content) - keep as is */}
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                            <GridIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Lignes de Production
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                Vue d'ensemble et statut des lignes opérationnelles
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

                {/* Charts Section */}
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 xl:col-span-8">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <RealTimeProductionChart />
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 h-full">
                            <ObjectiveChart />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Statut des Lignes</h2>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 border border-green-200">Actif: 10</span>
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">Maintenance: 1</span>
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">Arrêt: 1</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {lines.map((line) => (
                        <div
                            key={line.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BoxCubeIcon className="w-24 h-24" />
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${line.status === 'active' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                        line.status === 'maintenance' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {line.type}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{line.name}</h3>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {line.id.toUpperCase()}</span>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusColors[line.status]}`}>
                                    {statusLabels[line.status]}
                                </span>
                            </div>

                            <div className="mt-6 relative z-10">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Efficacité</span>
                                    <span className={`font-bold ${line.efficiency > 90 ? 'text-green-600' : line.efficiency > 80 ? 'text-indigo-600' : 'text-orange-500'}`}>
                                        {line.efficiency}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${line.status === 'active' ? 'bg-indigo-500' : 'bg-gray-400'
                                            }`}
                                        style={{ width: `${line.efficiency}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

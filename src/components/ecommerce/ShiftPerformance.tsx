import React from 'react';

const ShiftCard = ({ shift, time, efficiency, production, icon, color }: any) => {
    const isHigh = efficiency >= 90;
    const isMed = efficiency >= 80 && efficiency < 90;

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                {icon}
            </div>

            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg">{shift}</h4>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{time}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isHigh ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : isMed ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {efficiency}% Eff.
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Objectif</span>
                        <span className="font-bold text-gray-900 dark:text-white">1200</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${isHigh ? 'bg-green-500' : isMed ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${(production / 1200) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{production}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">pièces produites</span>
                </div>
            </div>
        </div>
    );
};

export default function ShiftPerformance() {
    return (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-default dark:border-gray-800 dark:bg-gray-900 xl:col-span-12">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Performance par Équipe
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Efficacité et production en temps réel (Matin / Après-midi / Nuit)
                    </p>
                </div>
                <select className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                    <option>Aujourd'hui</option>
                    <option>Hier</option>
                    <option>Cette Semaine</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ShiftCard
                    shift="Matin"
                    time="06:00 - 14:00"
                    efficiency={94}
                    production={1150}
                    color="text-orange-500"
                    icon={
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                    }
                />
                <ShiftCard
                    shift="Après-midi"
                    time="14:00 - 22:00"
                    efficiency={87}
                    production={890}
                    color="text-blue-500"
                    icon={
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                    }
                />
                <ShiftCard
                    shift="Nuit"
                    time="22:00 - 06:00"
                    efficiency={55}
                    production={210}
                    color="text-indigo-500"
                    icon={
                        <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                    }
                />
            </div>
        </div>
    );
}

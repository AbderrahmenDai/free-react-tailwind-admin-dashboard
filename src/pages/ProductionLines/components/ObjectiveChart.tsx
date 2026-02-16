import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const ObjectiveChart: React.FC = () => {
    const [period, setPeriod] = useState<'week' | 'month'>('week');

    // Mock Data
    const weekData = {
        series: [{
            name: 'Production Actuelle',
            data: [3500, 3800, 3100, 6400, 5200, 7800, 0]
        }, {
            name: 'Objectif',
            data: [4000, 4000, 4200, 6500, 6000, 8000, 8000]
        }],
        categories: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    };

    const monthData = {
        series: [{
            name: 'Production Actuelle',
            data: [15000, 18000, 12000, 24000]
        }, {
            name: 'Objectif',
            data: [16000, 18000, 15000, 25000]
        }],
        categories: ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4']
    };

    const currentData = period === 'week' ? weekData : monthData;

    const options: ApexOptions = {
        chart: {
            type: 'bar',
            height: 350,
            fontFamily: 'Satoshi, sans-serif',
            toolbar: { show: false }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                borderRadius: 4
            },
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: currentData.categories },
        yaxis: { title: { text: 'Unités' } },
        fill: { opacity: 1 },
        colors: ['#3C50E0', '#80CAEE'],
        legend: { position: 'top', horizontalAlign: 'right' },
        tooltip: {
            y: {
                formatter: function (val) {
                    return val + " Unités"
                }
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Using full height and flex col to ensure chart fits if container grows */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Performance vs Objectif
                    </h3>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setPeriod('week')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Semaine
                    </button>
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${period === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Mois
                    </button>
                </div>
            </div>
            <div id="chart-objective" className="flex-1">
                <ReactApexChart options={options} series={currentData.series} type="bar" height={350} />
            </div>
        </div>
    );
};

export default ObjectiveChart;

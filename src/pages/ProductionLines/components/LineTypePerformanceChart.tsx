import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const LineTypePerformanceChart: React.FC = () => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
    const [chartData, setChartData] = useState<{ series: { name: string, data: number[] }[], categories: string[] }>({
        series: [],
        categories: []
    });
    const [totals, setTotals] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/lines/type-stats?period=${period}`);
                const data = await response.json();
                setChartData(data);
                // Calculate totals
                const newTotals: { [key: string]: number } = {};
                data.series.forEach((s: any) => {
                    newTotals[s.name] = s.data.reduce((a: number, b: number) => a + b, 0);
                });
                setTotals(newTotals);

            } catch (error) {
                console.error("Error fetching stats:", error);
                // Fallback/Mock data if backend is empty
                const mockSeries = [
                    { name: 'FSB', data: [120, 200, 150, 80, 70, 110, 130] },
                    { name: 'RSC', data: [80, 110, 90, 40, 30, 50, 60] },
                    { name: 'RSB', data: [95, 130, 120, 60, 50, 80, 90] },
                    { name: 'FSC', data: [60, 90, 80, 30, 20, 40, 50] },
                ];

                const cats = period === 'day'
                    ? ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
                    : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

                setChartData({
                    categories: cats,
                    series: mockSeries
                });

                // Calculate totals for mock
                const newTotals: { [key: string]: number } = {};
                mockSeries.forEach((s: any) => {
                    newTotals[s.name] = s.data.reduce((a: number, b: number) => a + b, 0);
                });
                setTotals(newTotals);
            }
        };
        fetchData();
    }, [period]);

    const options: ApexOptions = {
        chart: {
            height: 350,
            type: 'area',
            fontFamily: 'Satoshi, sans-serif',
            toolbar: { show: false },
            animations: {
                enabled: true,
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        colors: ['#3C50E0', '#80CAEE', '#10B981', '#FFBA00'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: {
            categories: chartData.categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: '#64748B',
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            title: { text: 'Production' },
            labels: {
                style: {
                    colors: '#64748B',
                    fontSize: '12px'
                }
            }
        },
        grid: {
            strokeDashArray: 5,
            yaxis: { lines: { show: true } },
            borderColor: '#E2E8F0',
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        },
        legend: { position: 'top', horizontalAlign: 'right' },
        tooltip: {
            theme: 'light',
            fillSeriesColor: false,
            style: { fontSize: '14px' }
        }
    };

    return (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Performance par Type
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Vue d'ensemble de la production pour la période sélectionnée
                    </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {['day', 'week', 'month'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p as any)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-all duration-200 ${period === p
                                ? 'bg-white text-indigo-600 shadow-sm transform scale-105'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(totals).map(([type, total], index) => (
                    <div key={type} className={`p-4 rounded-xl border-l-4 ${index === 0 ? 'border-indigo-500' :
                        index === 1 ? 'border-sky-400' :
                            index === 2 ? 'border-green-500' : 'border-yellow-500'
                        } bg-gray-50 dark:bg-gray-800 animate-fadeIn`}>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{type}</span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-gray-900 dark:text-white">
                                {total.toLocaleString()}
                            </span>
                            <span className="text-xs font-medium text-gray-400">unités</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative">
                {/* Chart */}
                <ReactApexChart options={options} series={chartData.series} type="area" height={360} />
            </div>
        </div>
    );
};

export default LineTypePerformanceChart;

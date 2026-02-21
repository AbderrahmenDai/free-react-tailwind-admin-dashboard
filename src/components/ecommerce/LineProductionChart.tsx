import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { dashboardApi, DashboardStats } from "../../services/dashboardService";

export default function LineProductionChart() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dashboardApi.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-6 text-center">Chargement des données...</div>;

    const lineNames = stats?.lines.map(l => l.name) || [];
    const productionData = stats?.lines.map(l => l.production) || [];
    const objectiveData = stats?.lines.map(l => l.objective) || [];

    const options: ApexOptions = {
        colors: ["#465fff", "#e5e7eb"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height: 350,
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "55%",
                borderRadius: 5,
                borderRadiusApplication: "end",
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 2,
            colors: ["transparent"],
        },
        xaxis: {
            categories: lineNames,
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            title: {
                text: "Pièces",
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: (val: number) => `${val} pcs`,
            },
        },
        legend: {
            position: 'top',
        }
    };

    const series = [
        {
            name: "Production Réelle",
            data: productionData,
            color: "#465fff"
        },
        {
            name: "Objectif Journalier",
            data: objectiveData,
            color: "#9ca3af" // Gray for objective
        },
    ];

    return (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-default dark:border-gray-800 dark:bg-gray-900 xl:col-span-7">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        Production par Ligne
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Comparaison Production vs Objectif (Global 24h)
                    </p>
                </div>
            </div>

            <div className="max-w-full overflow-x-auto custom-scrollbar">
                <div id="chartOne" className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
                    <Chart options={options} series={series} type="bar" height={350} />
                </div>
            </div>
        </div>
    );
}

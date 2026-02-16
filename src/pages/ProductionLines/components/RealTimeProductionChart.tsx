import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

const options: ApexOptions = {
    chart: {
        height: 350,
        type: 'line',
        fontFamily: 'Satoshi, sans-serif',
        dropShadow: {
            enabled: true,
            color: '#000',
            top: 18,
            left: 7,
            blur: 10,
            opacity: 0.2
        },
        toolbar: {
            show: false
        }
    },
    colors: ['#3C50E0', '#80CAEE', '#10B981', '#FFBA00', '#FF5630'],
    dataLabels: {
        enabled: false,
    },
    stroke: {
        curve: 'smooth',
        width: 3,
    },
    title: {
        text: 'Production Horaire (FSB Lines)',
        align: 'left',
        style: {
            fontSize: '16px',
            color: '#666'
        }
    },
    grid: {
        borderColor: '#e7e7e7',
        row: {
            colors: ['#f3f3f3', 'transparent'],
            opacity: 0.5
        },
    },
    markers: {
        size: 4,
        colors: ["#fff"],
        strokeColors: ['#3C50E0', '#80CAEE', '#10B981', '#FFBA00', '#FF5630'],
        strokeWidth: 3,
        strokeOpacity: 0.9,
        strokeDashArray: 0,
        fillOpacity: 1,
        discrete: [],
        hover: {
            size: undefined,
            sizeOffset: 3
        }
    },
    xaxis: {
        categories: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
        title: {
            text: 'Heure'
        }
    },
    yaxis: {
        title: {
            text: 'Production (Unités)'
        },
        min: 0,
        max: 500
    },
    legend: {
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        offsetY: -25,
        offsetX: -5
    }
};

const series = [
    {
        name: "FSB 1",
        data: [120, 240, 310, 390, 110, 230, 340, 420, 200]
    },
    {
        name: "FSB 2",
        data: [100, 210, 290, 350, 90, 200, 310, 380, 150]
    },
    {
        name: "FSB 4",
        data: [150, 280, 350, 450, 140, 260, 390, 480, 220]
    },
    {
        name: "RSC 1",
        data: [80, 160, 220, 290, 70, 150, 210, 280, 100]
    },
    {
        name: "FSC 1",
        data: [130, 250, 320, 410, 120, 240, 350, 440, 210]
    }
];

const RealTimeProductionChart: React.FC = () => {
    return (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 shadow-default dark:border-gray-800 dark:bg-gray-900 xl:col-span-8">
            <div id="chart-real-time">
                <ReactApexChart options={options} series={series} type="line" height={350} />
            </div>
        </div>
    );
};

export default RealTimeProductionChart;

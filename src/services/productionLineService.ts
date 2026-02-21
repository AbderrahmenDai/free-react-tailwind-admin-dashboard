import api from './api';

export interface ProductionLine {
    id: string;
    code: string;
    nom: string;
    type: 'FSB' | 'RSC' | 'RSB' | 'FSC' | 'D34';
    statut: 'active' | 'maintenance' | 'stopped';
    efficacite: number;
    cadence: number;
    objectif: number;
}

export const productionLineApi = {
    getAll: async (): Promise<ProductionLine[]> => {
        const response = await api.get('/lines');
        return response.data;
    },
};

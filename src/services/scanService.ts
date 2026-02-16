import api from './api';

export const scanApi = {
  processScan: async (ordreFabricationId: string, galiaData: any, forceValidation = false, justification = '') => {
    const response = await api.post('/scan/process', {
      ordreFabricationId,
      galiaData,
      forceValidation,
      justification
    });
    return response.data;
  },
  
  getScanStatus: async (ofId: string) => {
    const response = await api.get(`/scan/status/${ofId}`);
    return response.data;
  },

  getHistory: async (limit = 50, offset = 0) => {
    const response = await api.get(`/scan/history?limit=${limit}&offset=${offset}`);
    return response.data;
  }
};

import api from './api';

export interface VerifyResult {
  ok: boolean;
  step: string;
  message: string;
  code?: string;
  data?: Record<string, unknown>;
}

export const scanApi = {
  processScan: async (ordreFabricationId: string, galiaData: unknown, forceValidation = false, justification = '') => {
    const response = await api.post('/scan/process', {
      ordreFabricationId,
      galiaData,
      forceValidation,
      justification
    });
    return response.data;
  },

  verifyScan: async (
    step: 'reference' | 'of' | 'hu',
    value: string,
    context?: { refCode?: string; ofNumero?: string; ofId?: string }
  ): Promise<VerifyResult> => {
    const response = await api.post('/scan/verify', { step, value, ...context });
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

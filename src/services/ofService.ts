import api from './api';

export const ofApi = {
  getAllOFs: async () => {
    const response = await api.get('/of');
    return response.data;
  },
  
  getOFById: async (id: string) => {
    const response = await api.get(`/of/${id}`);
    return response.data;
  },
  
  createOF: async (ofData: any) => {
    const response = await api.post('/of', ofData);
    return response.data;
  }
};

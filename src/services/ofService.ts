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
  },

  updateOF: async (id: string, ofData: any) => {
    const response = await api.put(`/of/${id}`, ofData);
    return response.data;
  },

  deleteOF: async (id: string) => {
    const response = await api.delete(`/of/${id}`);
    return response.data;
  }
};

import api from './api';

export const huApi = {
  createHU: async (huData: any) => {
    const response = await api.post('/hu', huData);
    return response.data;
  },

  updateHU: async (id: string, huData: any) => {
    const response = await api.put(`/hu/${id}`, huData);
    return response.data;
  },

  deleteHU: async (id: string) => {
    const response = await api.delete(`/hu/${id}`);
    return response.data;
  }
};

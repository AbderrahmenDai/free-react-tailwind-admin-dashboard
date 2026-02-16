import api from './api';

export const importApi = {
  downloadTemplate: async () => {
    const response = await api.get('/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Modele_Import_HU.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  previewImport: async (file: File, ofId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ordreFabricationId', ofId);
    
    // Check if Content-Type is auto-set or needs manual
    const response = await api.post('/import/hu/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  confirmImport: async (data: any[], ofId: string) => {
      // Data is the validated array from preview
      const response = await api.post('/import/hu/confirm', { data, ordreFabricationId: ofId });
      return response.data;
  }
};

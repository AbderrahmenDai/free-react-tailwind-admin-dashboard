import api from "./api";

export interface ReferenceProduit {
  id: string;
  codeReference: string;
  designation: string;
  indice: string;
  referenceInterne?: string;
  uniteMesure: string;
  familleProduit?: string;
  referenceClient?: string;
  version?: string;
  projet?: string;
  referenceClientIndice?: string;
  codeProjet?: string;
  airbagProgramm?: string;
  planificateurDeCode?: string;
  partNumber?: string;
  compteur?: number;
  shortDescriptionForLabel?: string;
  orientation?: string;
  tempsDeGamme?: string;
  colisage?: number;
  descriptionProjet?: string;
  couleurImpression?: string;
  refClientD2?: string;
  refInterneD2?: string;
  createdAt?: string;
}

export const referenceApi = {
  getAllReferences: async () => {
    const response = await api.get("/references");
    return response.data;
  },
  getReferenceById: async (id: string) => {
    const response = await api.get(`/references/${id}`);
    return response.data;
  },
  createReference: async (data: Partial<ReferenceProduit>) => {
    const response = await api.post("/references", data);
    return response.data;
  },
  updateReference: async (id: string, data: Partial<ReferenceProduit>) => {
    const response = await api.put(`/references/${id}`, data);
    return response.data;
  },
  deleteReference: async (id: string) => {
    const response = await api.delete(`/references/${id}`);
    return response.data;
  },
  importTemplate: async () => {
    const response = await api.get("/import/references/template", { responseType: 'blob' });
    return response.data;
  },
  previewImport: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/import/references/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },
  confirmImport: async (data: any[]) => {
    const response = await api.post("/import/references/confirm", { data });
    return response.data;
  }
};

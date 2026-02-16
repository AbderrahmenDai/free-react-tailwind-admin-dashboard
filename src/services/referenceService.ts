import api from "./api";

export interface ReferenceProduit {
  id: string;
  codeReference: string;
  designation: string;
  indice: string;
  referenceInterne?: string;
  uniteMesure: string;
  familleProduit?: string;
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
};

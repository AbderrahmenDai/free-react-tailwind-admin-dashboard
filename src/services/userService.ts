
import api from "./api";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "METHODE" | "SUPERVISEUR" | "AGENT_CONTROLE" | "AGENT_TICKET" | "OPERATOR" | "SUPERVISOR";
  isActive: boolean;
  createdAt: string;
}

export const userApi = {
  getAllUsers: async () => {
    const response = await api.get("/users");
    return response.data;
  },
  createUser: async (data: Partial<User>) => {
    const response = await api.post("/users", data);
    return response.data;
  },
  updateUser: async (id: string, data: Partial<User>) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

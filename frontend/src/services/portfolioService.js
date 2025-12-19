import api from './api';

export const portfolioService = {
  async getPortfolio() {
    const response = await api.get('/portfolio');
    return response.data;
  },

  async addAsset(assetData) {
    const response = await api.post('/portfolio', assetData);
    return response.data;
  },

  async deleteAsset(positionId) {
    // Eliminar una posición del portfolio
    const response = await api.delete(`/portfolio/${positionId}`);
    return response.data;
  },
};
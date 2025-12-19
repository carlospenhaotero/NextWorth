import api from './api';

export const userService = {
  async updateCurrency(baseCurrency) {
    const response = await api.patch('/user/settings', {
      baseCurrency,
    });
    return response.data;
  },
};




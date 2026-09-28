import type { Device, RegisterDeviceRequest } from '../types/device.types';
import client from './client.api';

export const devicesApi = {
  registerDevice: async (data: RegisterDeviceRequest): Promise<Device> => {
    const response = await client.post<Device>('/devices/register', data);
    return response.data;
  },

  listDevices: async (): Promise<Device[]> => {
    const response = await client.get<Device[]>('/devices');
    return response.data;
  },
};
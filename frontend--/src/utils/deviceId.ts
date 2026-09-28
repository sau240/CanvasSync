import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deviceID';

export default function generateDeviceId(): string {
  const existingDeviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!existingDeviceId) {
    const deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }
  return existingDeviceId;
}
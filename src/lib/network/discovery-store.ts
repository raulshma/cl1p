export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface LocalDeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  platform: string;
  userAgent: string;
  lastSeen: number;
}

export interface RoomJoinRequest {
  id: string;
  roomId: string;
  roomUrl?: string;
  senderDeviceId: string;
  senderName: string;
  senderDeviceType: DeviceType;
  senderPlatform: string;
  senderIp?: string;
  createdAt: number;
}

const LOCAL_DEVICE_TTL_MS = 2 * 60 * 1000;

const localDeviceInfoStore = new Map<string, LocalDeviceInfo>();

const roomRequests = new Map<string, RoomJoinRequest>();

function pruneLocalDevices() {
  const cutoff = Date.now() - LOCAL_DEVICE_TTL_MS;
  for (const [deviceId, info] of localDeviceInfoStore.entries()) {
    if (info.lastSeen < cutoff) {
      localDeviceInfoStore.delete(deviceId);
    }
  }
}

export function setLocalDeviceInfo(info: LocalDeviceInfo) {
  localDeviceInfoStore.set(info.deviceId, { ...info, lastSeen: Date.now() });
}

export function getLocalDeviceInfos(): LocalDeviceInfo[] {
  pruneLocalDevices();
  return Array.from(localDeviceInfoStore.values()).sort((a, b) => b.lastSeen - a.lastSeen);
}

export function getLocalDeviceInfo(): LocalDeviceInfo | null {
  const infos = getLocalDeviceInfos();
  return infos[0] ?? null;
}

export function addRoomRequest(request: RoomJoinRequest) {
  roomRequests.set(request.id, request);
}

export function getRoomRequests(): RoomJoinRequest[] {
  return Array.from(roomRequests.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function removeRoomRequest(id: string): boolean {
  return roomRequests.delete(id);
}

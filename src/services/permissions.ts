import {Platform} from 'react-native';
import {
  check,
  request,
  Permission,
  PermissionStatus,
  RESULTS,
} from 'react-native-permissions';

export type AppPermissionState = {
  camera: PermissionStatus;
  activity: PermissionStatus;
};

const getPermission = (kind: 'camera' | 'activity'): Permission => {
  if (Platform.OS === 'ios') {
    if (kind === 'camera') {
      return 'ios.permission.CAMERA';
    }
    return 'ios.permission.MOTION';
  }

  if (kind === 'camera') {
    return 'android.permission.CAMERA';
  }

  return 'android.permission.ACTIVITY_RECOGNITION';
};

export const checkCorePermissions = async (): Promise<AppPermissionState> => {
  const camera = await check(getPermission('camera'));
  const activity = await check(getPermission('activity'));
  return {camera, activity};
};

export const requestCorePermissions = async (): Promise<AppPermissionState> => {
  const camera = await request(getPermission('camera'));
  const activity = await request(getPermission('activity'));
  return {camera, activity};
};

export const hasRequiredPermissions = (state: AppPermissionState): boolean => {
  const accepted = [RESULTS.GRANTED, RESULTS.LIMITED];
  return accepted.includes(state.camera) && accepted.includes(state.activity);
};

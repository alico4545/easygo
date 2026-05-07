import {magnetometer, SensorTypes, setUpdateIntervalForType} from 'react-native-sensors';

export type CompassCallbacks = {
  onHeading: (headingDeg: number) => void;
};

export type CompassHandle = {
  stop: () => void;
};

const normalizeDeg = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const startCompass = ({onHeading}: CompassCallbacks): CompassHandle => {
  setUpdateIntervalForType(SensorTypes.magnetometer, 220);

  const sub = magnetometer.subscribe(({x, y}) => {
    const heading = (Math.atan2(y, x) * 180) / Math.PI;
    const normalizedHeading = normalizeDeg(heading);
    onHeading(normalizedHeading);
  });

  return {
    stop: () => sub.unsubscribe(),
  };
};

export const bearingFromPixels = (
  from: {xPx: number; yPx: number},
  to: {xPx: number; yPx: number},
): number => {
  const dx = to.xPx - from.xPx;
  const dy = to.yPx - from.yPx;
  const rad = Math.atan2(dx, -dy);
  const deg = (rad * 180) / Math.PI;
  return normalizeDeg(deg);
};

export const angleDeltaSigned = (fromDeg: number, toDeg: number): number => {
  const delta = ((toDeg - fromDeg + 540) % 360) - 180;
  return delta;
};

export const bearingToCardinal = (deg: number): 'Kuzey' | 'Dogu' | 'Guney' | 'Bati' => {
  if (deg >= 315 || deg < 45) {
    return 'Kuzey';
  }
  if (deg >= 45 && deg < 135) {
    return 'Dogu';
  }
  if (deg >= 135 && deg < 225) {
    return 'Guney';
  }
  return 'Bati';
};

export const turnInstruction = (signedDelta: number): string => {
  const abs = Math.abs(signedDelta);
  if (abs <= 15) {
    return 'Duz bakis yeterli';
  }
  if (abs <= 45) {
    return signedDelta > 0 ? 'Hafif saga don' : 'Hafif sola don';
  }
  if (abs <= 120) {
    return signedDelta > 0 ? 'Saga don' : 'Sola don';
  }
  return 'Geri don';
};

import {accelerometer, setUpdateIntervalForType, SensorTypes} from 'react-native-sensors';

export type StepCounterCallbacks = {
  onStep: () => void;
};

export type StepCounterHandle = {
  stop: () => void;
};

const STEP_THRESHOLD = 1.15;
const STEP_DEBOUNCE_MS = 360;

export const startStepCounter = ({onStep}: StepCounterCallbacks): StepCounterHandle => {
  let lastStepTimestamp = 0;
  let previousMagnitude = 0;

  setUpdateIntervalForType(SensorTypes.accelerometer, 120);

  const subscription = accelerometer.subscribe(({x, y, z}) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(magnitude - previousMagnitude);
    previousMagnitude = magnitude;

    const now = Date.now();
    const shouldCount = delta > STEP_THRESHOLD && now - lastStepTimestamp > STEP_DEBOUNCE_MS;

    if (shouldCount) {
      lastStepTimestamp = now;
      onStep();
    }
  });

  return {
    stop: () => {
      subscription.unsubscribe();
    },
  };
};

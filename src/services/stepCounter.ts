import {accelerometer, setUpdateIntervalForType, SensorTypes} from 'react-native-sensors';

export type StepCounterCallbacks = {
  onStep: () => void;
};

export type StepCounterHandle = {
  stop: () => void;
};

// Daha stabil adim sayimi icin hassasiyet azaltildi.
const STEP_THRESHOLD = 1.05;
const STEP_DEBOUNCE_MS = 550;
const GRAVITY_ALPHA = 0.90;

export const startStepCounter = ({onStep}: StepCounterCallbacks): StepCounterHandle => {
  let lastStepTimestamp = 0;
  let previousLinear = 0;
  let gravity = 9.81;
  let armed = true;

  setUpdateIntervalForType(SensorTypes.accelerometer, 100);

  const subscription = accelerometer.subscribe(({x, y, z}) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    gravity = GRAVITY_ALPHA * gravity + (1 - GRAVITY_ALPHA) * magnitude;
    const linear = magnitude - gravity;
    const delta = linear - previousLinear;
    previousLinear = linear;

    const now = Date.now();
    const risingPeak = linear > STEP_THRESHOLD && delta > 0;
    const rearm = linear < 0.1;
    if (rearm) {
      armed = true;
    }
    const shouldCount = armed && risingPeak && now - lastStepTimestamp > STEP_DEBOUNCE_MS;

    if (shouldCount) {
      armed = false;
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

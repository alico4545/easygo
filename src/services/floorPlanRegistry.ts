import {FloorPlanAsset} from '../types/navigation';

let assets: FloorPlanAsset[] = [
  {
    id: 'mock-zemin',
    floor: 0,
    fileName: 'zemin_kat_demo.png',
    mimeType: 'image/png',
    source: 'mock',
  },
];

export const getFloorPlanAssets = (): FloorPlanAsset[] => {
  return assets;
};

export const addManualFloorPlanAsset = (
  payload: Pick<FloorPlanAsset, 'floor' | 'fileName' | 'mimeType'>,
): FloorPlanAsset => {
  const newAsset: FloorPlanAsset = {
    id: `manual-${Date.now()}`,
    source: 'manual-upload',
    ...payload,
  };

  assets = [...assets, newAsset];
  return newAsset;
};

export type NodeType = 'room' | 'junction' | 'elevator' | 'stairs' | 'entrance' | 'service';

export type BuildingNode = {
  id: string;
  name: string;
  floor: number;
  type: NodeType;
};

export type BuildingEdge = {
  from: string;
  to: string;
  steps: number;
  instruction: string;
};

export type BuildingMap = {
  id: string;
  name: string;
  floors: number[];
  nodes: BuildingNode[];
  edges: BuildingEdge[];
};

export type RouteStep = {
  from: string;
  to: string;
  steps: number;
  instruction: string;
};

export type RouteResult = {
  nodes: BuildingNode[];
  steps: RouteStep[];
  totalSteps: number;
};

export type FloorPlanAsset = {
  id: string;
  floor: number;
  fileName: string;
  mimeType: 'image/png' | 'application/pdf' | 'unknown';
  source: 'mock' | 'manual-upload';
};

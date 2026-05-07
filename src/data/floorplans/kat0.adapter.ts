import {BuildingMap, BuildingNode, NodeType} from '../../types/navigation';
import {KAT0_DATASET, METERS_TO_STEPS} from './kat0.generated';

const nodeTypeById: Record<string, NodeType> = {
  N1: 'entrance',
  N2: 'junction',
  N3: 'junction',
  N4: 'stairs',
  N5: 'junction',
  N6: 'room',
  N7: 'room',
  N8: 'service',
  N9: 'junction',
  N10: 'entrance',
  N11: 'room',
  N12: 'room',
  N13: 'room',
};

const toBuildingNode = (id: string, name: string, floor: number): BuildingNode => ({
  id,
  name,
  floor,
  type: nodeTypeById[id] ?? 'junction',
});

export const KAT0_BUILDING_MAP: BuildingMap = {
  id: `${KAT0_DATASET.buildingId}-kat0-v2`,
  name: 'Kat 0 Yeni Kroki',
  floors: [0],
  nodes: KAT0_DATASET.nodes.map(node => toBuildingNode(node.id, node.name, node.floor)),
  edges: KAT0_DATASET.edges.map(edge => ({
    from: edge.from,
    to: edge.to,
    steps: METERS_TO_STEPS(edge.meters),
    instruction: `${edge.instruction} (~${edge.meters.toFixed(2)} m)`,
  })),
};

export const KAT0_DESTINATION_IDS = new Set(['N6', 'N7', 'N8', 'N10']);

export const KAT0_QR_NODE_IDS = new Set(
  KAT0_DATASET.nodes.filter(n => n.qrPayload).map(n => n.id),
);

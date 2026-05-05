import {BuildingMap, BuildingNode, NodeType} from '../../types/navigation';
import {KAT0_DATASET, METERS_TO_STEPS} from './kat0.generated';

const nodeTypeById: Record<string, NodeType> = {
  N1: 'entrance',
  N2: 'junction',
  N3: 'junction',
  N4: 'stairs',
  N5: 'junction',
  N6: 'room',
  N7A: 'room',
  N7B: 'room',
  N8: 'service',
  N9: 'room',
  N10: 'entrance',
};

const toBuildingNode = (id: string, name: string, floor: number): BuildingNode => ({
  id,
  name,
  floor,
  type: nodeTypeById[id] ?? 'junction',
});

export const KAT0_BUILDING_MAP: BuildingMap = {
  id: `${KAT0_DATASET.buildingId}-kat0`,
  name: 'Kat 0 (Zemin Kat)',
  floors: [0],
  nodes: KAT0_DATASET.nodes.map(node => toBuildingNode(node.id, node.name, node.floor)),
  edges: KAT0_DATASET.edges.map(edge => ({
    from: edge.from,
    to: edge.to,
    steps: METERS_TO_STEPS(edge.meters),
    instruction: `${edge.instruction} (~${edge.meters.toFixed(1)} m)`,
  })),
};

export const KAT0_DESTINATION_IDS = new Set([
  'N6',
  'N7A',
  'N7B',
  'N8',
  'N9',
  'N10',
]);

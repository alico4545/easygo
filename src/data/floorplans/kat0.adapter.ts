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

const STEP_OVERRIDES: Record<string, number> = {
  // Kalibrasyon adimlari:
  // N1 -> N3: 10 adim
  // N3 -> N4: 7 adim
  // N4 -> N5: 19 adim
  // N5 -> N10: 10 adim
  // N4 -> N2 toplam: 13 adim (N4->N3->N13->N2)
  // N2 -> N9 toplam: 38 adim (N2->N12->N11->N9)
  // N6 (WC Erkek) -> N9 toplam: 43 adim (N6->N12->N11->N9)
  // N3 -> N6 (WC Erkek): 5 adim
  'N1->N3': 10,
  'N3->N4': 7,
  'N3->N6': 5,
  'N3->N13': 3,
  'N13->N2': 3,
  'N4->N5': 19,
  'N5->N10': 10,
  'N6->N12': 18,
  'N2->N12': 13,
  'N12->N11': 13,
  'N11->N9': 12,
};

export const KAT0_BUILDING_MAP: BuildingMap = {
  id: `${KAT0_DATASET.buildingId}-kat0-v2`,
  name: 'Kat 0 Yeni Kroki',
  floors: [0],
  nodes: KAT0_DATASET.nodes.map(node => toBuildingNode(node.id, node.name, node.floor)),
  edges: KAT0_DATASET.edges.map(edge => ({
    from: edge.from,
    to: edge.to,
    steps: STEP_OVERRIDES[`${edge.from}->${edge.to}`] ?? METERS_TO_STEPS(edge.meters),
    instruction: `${edge.instruction} (~${edge.meters.toFixed(2)} metre)`,
  })),
};

export const KAT0_DESTINATION_IDS = new Set(['N6', 'N7', 'N8', 'N10']);

export const KAT0_QR_NODE_IDS = new Set(
  KAT0_DATASET.nodes.filter(n => n.qrPayload).map(n => n.id),
);

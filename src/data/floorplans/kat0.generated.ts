export type FloorNode = {
  id: string;
  name: string;
  floor: number;
  xPx: number;
  yPx: number;
  qrPayload: string;
  note?: string;
};

export type FloorEdge = {
  from: string;
  to: string;
  meters: number;
  corridor: string;
  instruction: string;
};

export type FloorPlanDataset = {
  buildingId: string;
  floor: number;
  mapImage: string;
  scale: {
    metersPerPixel: number;
    pixelsPerMeter: number;
    source: string;
  };
  assumptions: string[];
  nodes: FloorNode[];
  edges: FloorEdge[];
};

const BUILDING_ID = 'okul-a';

const qr = (nodeId: string, floor: number) => `EG|${BUILDING_ID}|F${floor}|${nodeId}`;

export const KAT0_DATASET: FloorPlanDataset = {
  buildingId: BUILDING_ID,
  floor: 0,
  mapImage: 'kat0.png',
  scale: {
    pixelsPerMeter: 50,
    metersPerPixel: 1 / 50,
    source: 'Plan üzerinde belirtilen: OLCEK 1 METRE = 50 PIXEL',
  },
  assumptions: [
    'Node koordinatlari piksel olarak plandan yaklasik alinmistir.',
    'Edge mesafeleri node merkezleri arasi yurunebilir yol uzunluguna gore yaklasik hesaplanmistir.',
    'Saha olcumu ile duzeltme onerilir (ozellikle kose donuslerinde).',
  ],
  nodes: [
    {id: 'N1', name: 'Ana Giris', floor: 0, xPx: 880, yPx: 145, qrPayload: qr('N1', 0)},
    {id: 'N2', name: 'Koridor Sol Kavsak', floor: 0, xPx: 300, yPx: 420, qrPayload: qr('N2', 0)},
    {id: 'N3', name: 'Koridor Sag Kavsak', floor: 0, xPx: 860, yPx: 420, qrPayload: qr('N3', 0)},
    {id: 'N4', name: 'Merdiven Alt/Ust', floor: 0, xPx: 830, yPx: 585, qrPayload: qr('N4', 0), note: 'Kat gecis dogrulama noktasi'},
    {id: 'N5', name: 'Koridor Asagi Donus', floor: 0, xPx: 780, yPx: 760, qrPayload: qr('N5', 0)},
    {id: 'N6', name: 'WC Erkek Kapisi', floor: 0, xPx: 650, yPx: 640, qrPayload: qr('N6', 0)},
    {id: 'N7A', name: 'Laboratuvar Kapisi Sol', floor: 0, xPx: 170, yPx: 610, qrPayload: qr('N7A', 0)},
    {id: 'N7B', name: 'Laboratuvar Kapisi Sag', floor: 0, xPx: 520, yPx: 610, qrPayload: qr('N7B', 0)},
    {id: 'N8', name: 'Sef Odasi Kapisi', floor: 0, xPx: 335, yPx: 640, qrPayload: qr('N8', 0)},
    {id: 'N9', name: 'WC Erkek Sol Uc Kapisi', floor: 0, xPx: 80, yPx: 350, qrPayload: qr('N9', 0)},
    {id: 'N10', name: 'Arka Cikis Kapisi', floor: 0, xPx: 780, yPx: 1090, qrPayload: qr('N10', 0)},
  ],
  edges: [
    {
      from: 'N1',
      to: 'N3',
      meters: 5.6,
      corridor: 'Sag dikey koridor',
      instruction: 'Ana giristen duz ilerleyin ve sag kavsaga ulasin.',
    },
    {
      from: 'N3',
      to: 'N2',
      meters: 11.2,
      corridor: 'Ust yatay koridor',
      instruction: 'Koridor boyunca sola devam edin.',
    },
    {
      from: 'N2',
      to: 'N9',
      meters: 4.4,
      corridor: 'Sol ust koridor',
      instruction: 'Sol uca ilerleyin.',
    },
    {
      from: 'N3',
      to: 'N4',
      meters: 3.3,
      corridor: 'Merdiven oncesi baglanti',
      instruction: 'Merdiven noktasina ilerleyin.',
    },
    {
      from: 'N4',
      to: 'N5',
      meters: 3.6,
      corridor: 'Dikey baglanti',
      instruction: 'Asagi koridora inin.',
    },
    {
      from: 'N5',
      to: 'N10',
      meters: 6.6,
      corridor: 'Arka cikis koridoru',
      instruction: 'Duz gidip arka cikisa ulasin.',
    },
    {
      from: 'N5',
      to: 'N6',
      meters: 3.5,
      corridor: 'Alt yatay koridor',
      instruction: 'Sola donerek WC erkek kapisina ilerleyin.',
    },
    {
      from: 'N6',
      to: 'N7B',
      meters: 2.6,
      corridor: 'Alt yatay koridor',
      instruction: 'Sola devam edin, laboratuvar kapisina ulasin.',
    },
    {
      from: 'N7B',
      to: 'N8',
      meters: 3.7,
      corridor: 'Alt yatay koridor',
      instruction: 'Sef odasi kapisina kadar ilerleyin.',
    },
    {
      from: 'N8',
      to: 'N7A',
      meters: 3.3,
      corridor: 'Alt yatay koridor',
      instruction: 'Koridor soluna ilerleyin.',
    },
    {
      from: 'N6',
      to: 'N2',
      meters: 5.0,
      corridor: 'Iceri baglanti',
      instruction: 'Ust koridora baglanan gecise ilerleyin.',
    },
  ],
};

export const METERS_TO_STEPS = (meters: number, stepLengthMeters = 0.72): number => {
  return Math.max(1, Math.round(meters / stepLengthMeters));
};

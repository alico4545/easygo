export type FloorNode = {
  id: string;
  name: string;
  floor: number;
  xPx: number;
  yPx: number;
  qrPayload: string | null;
  note?: string;
};

export type FloorEdge = {
  from: string;
  to: string;
  meters: number;
  corridor: string;
  instruction: string;
};

export type FloorPoi = {
  id: string;
  name: string;
  floor: number;
  nearNodeId: string;
  offsetMeters: number;
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
  pois: FloorPoi[];
};

const BUILDING_ID = 'okul-a';

const qr = (nodeId: string, floor: number) => `EG|${BUILDING_ID}|F${floor}|${nodeId}`;

export const KAT0_DATASET: FloorPlanDataset = {
  buildingId: BUILDING_ID,
  floor: 0,
  mapImage: 'kat0_olcekli.png',
  scale: {
    pixelsPerMeter: 50,
    metersPerPixel: 1 / 50,
    source: 'Plan üzerindeki ölçek: 1 metre = 50 piksel',
  },
  assumptions: [
    'Yeni krokiye göre sadece kritik noktalarda QR vardır.',
    'Kritik QR node seti: N1, N2, N3, N4, N5, N9, N10.',
    'N6, N7, N8 kapı hedef noktalarıdır (node/poi, ancak QR zorunlu değil).',
    'Bu sürümde temel omurga mesafeleri kullanıcının verdiği ölçülere göre güncellenmiştir.',
    'N4-N5-N10 bölgesi kat1 değil, kat0 içindeki yükseltili blok olarak modellenmiştir.',
  ],
  nodes: [
    {id: 'N1', name: 'Ana Giriş', floor: 0, xPx: 2388, yPx: 249, qrPayload: qr('N1', 0), note: 'Eşikten bina içine doğu yönünde 2 adım kalibrasyon'},
    {id: 'N2', name: 'Koridor Sol Kavşak', floor: 0, xPx: 1500, yPx: 910, qrPayload: qr('N2', 0)},
    {id: 'N3', name: 'Koridor Sağ Kavşak', floor: 0, xPx: 2430, yPx: 910, qrPayload: qr('N3', 0), note: 'N2 koridoru orta hat hizasi icin merkez cizgiye alinmistir (ince ayar +20px asagi)'},
    {id: 'N4', name: 'Merdiven Alt/Üst', floor: 0, xPx: 2170, yPx: 1200, qrPayload: qr('N4', 0), note: 'Kat geçiş doğrulaması'},
    {id: 'N5', name: 'Koridor Aşağı Dönüş', floor: 0, xPx: 2200, yPx: 1750, qrPayload: qr('N5', 0)},
    {id: 'N6', name: 'WC Erkek Kapısı', floor: 0, xPx: 2100, yPx: 906, qrPayload: null, note: 'Koridor köşesine alınmış kalibrasyon (oda içi sapmayı engeller)'},
    {id: 'N7', name: 'Laboratuvar Kapısı', floor: 0, xPx: 1335, yPx: 890, qrPayload: null, note: 'N3 kalibrasyon trendiyle hizalandı'},
    {id: 'N8', name: 'Şef Odası Kapısı', floor: 0, xPx: 900, yPx: 890, qrPayload: null, note: 'N3 kalibrasyon trendiyle hizalandı'},
    {id: 'N9', name: 'Koridor Çıkış Sol Uç', floor: 0, xPx: 100, yPx: 910, qrPayload: qr('N9', 0)},
    {id: 'N10', name: 'Arka Çıkış Kapısı', floor: 0, xPx: 2200, yPx: 2150, qrPayload: qr('N10', 0)},
    {id: 'N11', name: 'Kütüphane Kapısı Hattı', floor: 0, xPx: 860, yPx: 910, qrPayload: null},
    {id: 'N12', name: 'Depo Kapısı Hattı', floor: 0, xPx: 1320, yPx: 910, qrPayload: null},
    {id: 'N13', name: 'Öğretmenler Kapısı Hattı', floor: 0, xPx: 1910, yPx: 910, qrPayload: null},
  ],
  edges: [
    {from: 'N1', to: 'N3', meters: 5.2, corridor: 'Dikey giriş koridoru', instruction: 'Güney yönünde düz ilerleyin.'},
    {from: 'N3', to: 'N13', meters: 4.7, corridor: 'Üst ana koridor', instruction: 'Batı yönünde öğretmenler odası hattına ilerleyin.'},
    {from: 'N13', to: 'N2', meters: 4.8, corridor: 'Üst ana koridor', instruction: 'Koridorun orta noktasına ilerleyin.'},
    {from: 'N2', to: 'N12', meters: 4.3, corridor: 'Üst koridor', instruction: 'Ana koridorda batı yönüne ilerleyin.'},
    {from: 'N12', to: 'N11', meters: 5.0, corridor: 'Üst koridor', instruction: 'Kütüphane kapısı hattına ilerleyin.'},
    {from: 'N11', to: 'N9', meters: 4.5, corridor: 'Üst koridor sol kol', instruction: 'Koridorun sol ucuna ilerleyin.'},
    {from: 'N3', to: 'N4', meters: 4.0, corridor: 'Merdiven bağlantısı', instruction: 'Merdiven bölgesine inin.'},
    {from: 'N3', to: 'N6', meters: 6.2, corridor: 'Sağ-alt koridor bağlantısı', instruction: 'Merdivenleri geçmeden WC Erkek kapısı hattına ilerleyin.'},
    {from: 'N4', to: 'N5', meters: 7.0, corridor: 'Yükselti geçişi', instruction: 'Yükseltili bloğa geçip koridor dönüşüne ulaşın.'},
    {from: 'N5', to: 'N10', meters: 14.7, corridor: 'Arka çıkış koridoru', instruction: 'Arka çıkışa doğru düz ilerleyin.'},
    {from: 'N5', to: 'N6', meters: 2.6, corridor: 'Sağ alt koridor köşe geçişi', instruction: 'Koridor köşesinden WC Erkek hattına bağlanın.'},
    {from: 'N6', to: 'N13', meters: 4.6, corridor: 'Sağ üst geçiş', instruction: 'WC Erkek köşesinden yukarı çıkarak Öğretmenler kapısı hattına ilerleyin.'},
    {from: 'N6', to: 'N12', meters: 7.9, corridor: 'Ana koridor orta geçiş', instruction: 'Ana koridorda batı yönüne ilerleyin.'},
    {from: 'N2', to: 'N8', meters: 3.9, corridor: 'Orta geçiş', instruction: 'Orta geçişten Şef Odası kapısına inin.'},
    {from: 'N8', to: 'N7', meters: 3.5, corridor: 'Alt yatay koridor', instruction: 'Sağa ilerleyip Laboratuvar kapısına gidin.'},
    {from: 'N7', to: 'N6', meters: 3.2, corridor: 'Alt yatay koridor', instruction: 'WC Erkek kapısına doğru devam edin.'},
  ],
  pois: [
    {id: 'P01', name: 'Rehberlik Odası', floor: 0, nearNodeId: 'N1', offsetMeters: 1.1},
    {id: 'P02', name: 'Müdür Yardımcısı Odası 1', floor: 0, nearNodeId: 'N3', offsetMeters: 1.2},
    {id: 'P03', name: 'Öğretmenler Odası', floor: 0, nearNodeId: 'N13', offsetMeters: 0.8},
    {id: 'P04', name: 'Depo', floor: 0, nearNodeId: 'N12', offsetMeters: 0.8},
    {id: 'P05', name: 'Kütüphane', floor: 0, nearNodeId: 'N11', offsetMeters: 0.9},
    {id: 'P06', name: 'WC Kadın', floor: 0, nearNodeId: 'N9', offsetMeters: 0.8},
    {id: 'P07', name: 'Spor Odası', floor: 0, nearNodeId: 'N3', offsetMeters: 1.0},
    {id: 'P08', name: 'Laboratuvar 1', floor: 0, nearNodeId: 'N7', offsetMeters: 0.9},
    {id: 'P09', name: 'Laboratuvar 2', floor: 0, nearNodeId: 'N8', offsetMeters: 1.2},
    {id: 'P10', name: 'Bilişim Şef Odası', floor: 0, nearNodeId: 'N8', offsetMeters: 0.7},
    {id: 'P11', name: 'WC Erkek', floor: 0, nearNodeId: 'N6', offsetMeters: 0.6},
    {id: 'P12', name: 'Müdür Yardımcısı Odası 2', floor: 0, nearNodeId: 'N5', offsetMeters: 1.0},
    {id: 'P13', name: 'Müdür Yardımcısı Odası 3', floor: 0, nearNodeId: 'N5', offsetMeters: 2.0},
    {id: 'P14', name: 'Hizmetli Odası (Sol)', floor: 0, nearNodeId: 'N10', offsetMeters: 1.1},
    {id: 'P15', name: 'Müdür Odası', floor: 0, nearNodeId: 'N10', offsetMeters: 1.2},
    {id: 'P16', name: 'Müdür Yardımcısı Odası 4', floor: 0, nearNodeId: 'N10', offsetMeters: 1.8},
    {id: 'P17', name: 'Hizmetli Odası (Sağ - Eski Çay Ocağı)', floor: 0, nearNodeId: 'N10', offsetMeters: 0.9},
  ],
};

export const METERS_TO_STEPS = (meters: number, stepLengthMeters = 0.55): number => {
  return Math.max(1, Math.round(meters / stepLengthMeters));
};

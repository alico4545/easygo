import {BuildingMap} from '../types/navigation';

export const DEMO_BUILDING_MAP: BuildingMap = {
  id: 'hospital-a',
  name: 'Hastane A Blok',
  floors: [0, 1],
  nodes: [
    {id: 'entrance_main', name: 'Ana Giriş', floor: 0, type: 'entrance'},
    {id: 'info_desk', name: 'Danışma', floor: 0, type: 'service'},
    {id: 'corridor_a', name: 'Koridor A', floor: 0, type: 'junction'},
    {id: 'blood_unit', name: 'Kan Alma Birimi', floor: 0, type: 'room'},
    {id: 'elevator_0', name: 'Asansör (Zemin)', floor: 0, type: 'elevator'},
    {id: 'elevator_1', name: 'Asansör (1. Kat)', floor: 1, type: 'elevator'},
    {id: 'radiology', name: 'Radyoloji', floor: 1, type: 'room'},
  ],
  edges: [
    {
      from: 'entrance_main',
      to: 'info_desk',
      steps: 12,
      instruction: '12 adım düz ilerleyin.',
    },
    {
      from: 'info_desk',
      to: 'corridor_a',
      steps: 2,
      instruction: 'Danışmanın yanından sağa dönün.',
    },
    {
      from: 'corridor_a',
      to: 'blood_unit',
      steps: 18,
      instruction: '18 adım koridor boyunca ilerleyin. Sol taraftaki ilk kapı hedefiniz.',
    },
    {
      from: 'corridor_a',
      to: 'elevator_0',
      steps: 10,
      instruction: 'Koridor sonundaki asansöre ilerleyin.',
    },
    {
      from: 'elevator_0',
      to: 'elevator_1',
      steps: 0,
      instruction: 'Asansör ile 1. kata çıkın ve QR/NFC doğrulaması yapın.',
    },
    {
      from: 'elevator_1',
      to: 'radiology',
      steps: 14,
      instruction: 'Asansörden çıkınca sola dönüp 14 adım ilerleyin.',
    },
  ],
};

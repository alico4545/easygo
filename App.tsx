import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Tts from 'react-native-tts';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Linking,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIRECTION_ALIGNMENT_THRESHOLD_DEG = 60;
const N1_N3_ALIGNMENT_THRESHOLD_DEG = 30;
const N1_N3_SOUTH_ALIGNMENT_DEG = 40;
const N3_N1_ALIGNMENT_THRESHOLD_DEG = 30;
const N3_N1_NORTH_ALIGNMENT_DEG = 40;
const WEST_CORRIDOR_ALIGNMENT_DEG = 45;
const DEFAULT_BEARING_OFFSET_DEG = 45;

const normalizeDeg = (value: number): number => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const WEST_CORRIDOR_DESTINATIONS = new Set(['P04', 'P05', 'P06', 'P08', 'P09', 'P10', 'P11']);
const WEST_CORRIDOR_NODES = new Set(['N3', 'N13', 'N2', 'N12', 'N11', 'N9', 'N8', 'N7', 'N6']);
const EAST_CORRIDOR_DESTINATIONS = new Set(['P01', 'P02', 'P03', 'P04', 'P05', 'P07', 'P08', 'P09', 'P10', 'P11']);
const EAST_CORRIDOR_NODES = new Set(['N9', 'N11', 'N12', 'N2', 'N13', 'N3', 'N1', 'N8', 'N7', 'N6']);
const MID_CORRIDOR_NODES = new Set(['N9', 'N11', 'N12', 'N2', 'N13', 'N3']);

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import {
  DestinationModal,
  FloorPlanUploadModal,
  PermissionModal,
  QRStartModal,
  ArrivalModal,
  WrongDirectionModal,
} from './src/components';
import {
  KAT0_BUILDING_MAP,
  KAT0_DATASET,
  KAT0_DESTINATION_IDS,
  KAT0_QR_NODE_IDS,
} from './src/data/floorplans';
import { findShortestRoute } from './src/services/pathfinding';
import {
  checkCorePermissions,
  hasRequiredPermissions,
  requestCorePermissions,
} from './src/services/permissions';
import { addManualFloorPlanAsset, getFloorPlanAssets } from './src/services/floorPlanRegistry';
import {
  angleDeltaSigned,
  bearingFromPixels,
  bearingToCardinal,
  startCompass,
  turnInstruction,
} from './src/services/compass';
import { startStepCounter, StepCounterHandle } from './src/services/stepCounter';
import { NavigationSessionScreen, SplashScreen } from './src/screens';
import { BuildingNode, RouteResult } from './src/types/navigation';

const POI_PIN_OVERRIDES: Record<string, { xPx: number; yPx: number }> = {
  // Mudur Yardimcisi Odasi 1 kapisi (koridor tarafi)
  P02: { xPx: 2310, yPx: 705 },
};

const ROUTE_TOTAL_STEP_CALIBRATIONS: Record<string, number> = {
  // N1 koridoru kalibrasyonu (gercek adim)
  // N1 -> Rehberlik: 2 adim
  'N1|P01': 2,
  // N1 -> Mudur Yardimcisi 1: 5 adim
  'N1|P02': 5,
  // N1 -> N3 hatti hedefi (Spor odasi/N3): 10 adim
  'N1|P07': 10,
  // N1 -> Ogretmenler: 10 adim guney + 9 adim bati = 19 adim
  'N1|P03': 19,
  // N1 -> WC Erkek: 15 adim (N1->N3:10 + N3->N6:5)
  'N1|P11': 15,
  // N13 baslangici (N2 bati koridoru kalibrasyonlari)
  'N13|P04': 10, // Depo
  'N13|P05': 13, // Kutuphane
  'N13|P06': 28, // WC Kadin
  'N13|P08': 11, // Laboratuvar 1
  'N13|P10': 15, // Sef Odasi
  'N13|P09': 25, // Laboratuvar 2
  // N9 baslangici (N2 dogu koridoru)
  'N9|P05': 12,
  'N9|P04': 25,
  'N9|P03': 28,
  'N9|P07': 37,
  'N9|P02': 37,
  'N9|P01': 47,
  'N9|P11': 30,
  'N9|P08': 39,
  'N9|P10': 43,
  'N9|P09': 53,
};

const applyRouteTotalStepCalibration = (
  route: RouteResult,
  startNodeId: string,
  destinationOptionId: string | null,
): RouteResult => {
  if (!destinationOptionId || route.steps.length === 0) {
    return route;
  }
  const targetTotal = ROUTE_TOTAL_STEP_CALIBRATIONS[`${startNodeId}|${destinationOptionId}`];
  if (!targetTotal || targetTotal <= 0) {
    return route;
  }

  const currentTotal = route.steps.reduce((sum, step) => sum + step.steps, 0);
  if (currentTotal <= 0 || currentTotal === targetTotal) {
    return route;
  }

  const scaled = route.steps.map(step => ({
    ...step,
    steps: Math.max(1, Math.round((step.steps / currentTotal) * targetTotal)),
  }));
  let scaledTotal = scaled.reduce((sum, step) => sum + step.steps, 0);
  const delta = targetTotal - scaledTotal;
  if (delta !== 0 && scaled.length > 0) {
    scaled[scaled.length - 1] = {
      ...scaled[scaled.length - 1],
      steps: Math.max(1, scaled[scaled.length - 1].steps + delta),
    };
    scaledTotal = scaled.reduce((sum, step) => sum + step.steps, 0);
  }

  return {
    ...route,
    steps: scaled,
    totalSteps: scaledTotal,
  };
};

const buildRouteViaCheckpoints = (
  startNodeId: string,
  targetNodeId: string,
  checkpoints: string[],
): RouteResult | null => {
  const sequence = [startNodeId, ...checkpoints, targetNodeId].filter(
    (id, index, arr) => index === 0 || id !== arr[index - 1],
  );

  let mergedNodes: BuildingNode[] = [];
  let mergedSteps: RouteResult['steps'] = [];

  for (let i = 0; i < sequence.length - 1; i += 1) {
    const segment = findShortestRoute(KAT0_BUILDING_MAP, sequence[i], sequence[i + 1]);
    if (!segment) {
      return null;
    }

    if (mergedNodes.length === 0) {
      mergedNodes = [...segment.nodes];
    } else {
      mergedNodes.push(...segment.nodes.slice(1));
    }
    mergedSteps.push(...segment.steps);
  }

  return {
    nodes: mergedNodes,
    steps: mergedSteps,
    totalSteps: mergedSteps.reduce((sum, step) => sum + step.steps, 0),
  };
};

const getRearCorridorPolicyCheckpoints = (
  startNodeId: string,
  targetNodeId: string,
): string[] | null => {
  if (startNodeId !== 'N10' && startNodeId !== 'N5') {
    return null;
  }

  const base: string[] = startNodeId === 'N10' ? ['N5'] : [];

  if (targetNodeId === 'N10' || targetNodeId === 'N5') {
    return base;
  }

  if (targetNodeId === 'N6') {
    return [...base, 'N6'];
  }
  if (targetNodeId === 'N7') {
    return [...base, 'N6', 'N7'];
  }
  if (targetNodeId === 'N8') {
    return [...base, 'N6', 'N7', 'N8'];
  }
  if (targetNodeId === 'N2') {
    return [...base, 'N6', 'N7', 'N8', 'N2'];
  }
  if (targetNodeId === 'N12') {
    return [...base, 'N6', 'N7', 'N8', 'N2', 'N12'];
  }
  if (targetNodeId === 'N11') {
    return [...base, 'N6', 'N7', 'N8', 'N2', 'N12', 'N11'];
  }
  if (targetNodeId === 'N9') {
    return [...base, 'N6', 'N7', 'N8', 'N2', 'N12', 'N11', 'N9'];
  }
  if (targetNodeId === 'N13') {
    return [...base, 'N6', 'N7', 'N8', 'N2', 'N13'];
  }

  if (targetNodeId === 'N4') {
    return [...base, 'N4'];
  }
  if (targetNodeId === 'N3') {
    return [...base, 'N4', 'N3'];
  }
  if (targetNodeId === 'N1') {
    return [...base, 'N4', 'N3', 'N1'];
  }

  return [...base, 'N6'];
};

function App() {
  type DestinationOption = {
    id: string;
    name: string;
    floor: number;
    targetNodeId: string;
    nearNodeId: string;
    offsetMeters: number;
  };

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [showWrongDirectionModal, setShowWrongDirectionModal] = useState(false);
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'navigation'>('home');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [bearingOffsetDeg, setBearingOffsetDeg] = useState(DEFAULT_BEARING_OFFSET_DEG);

  const drawerAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setShowHamburgerMenu(true);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHamburgerMenu(false);
    });
  };

  const [permissionsReady, setPermissionsReady] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [destinationNodeId, setDestinationNodeId] = useState<string | null>(null);
  const [destinationOptionId, setDestinationOptionId] = useState<string | null>(null);
  const [selectedDestinationLabel, setSelectedDestinationLabel] = useState<string | null>(null);
  const [selectedDestinationNearNodeId, setSelectedDestinationNearNodeId] = useState<string | null>(null);
  const [selectedDestinationOffsetMeters, setSelectedDestinationOffsetMeters] = useState(0);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [deviationScore, setDeviationScore] = useState(0);
  const [wrongDirectionStreak, setWrongDirectionStreak] = useState(0);
  const [qrRecalibrationReason, setQrRecalibrationReason] = useState<string | null>(null);

  const [sensorSteps, setSensorSteps] = useState(0);
  const [routeProgressSteps, setRouteProgressSteps] = useState(0);
  const [floorPlans, setFloorPlans] = useState(getFloorPlanAssets());
  const [headingDeg, setHeadingDeg] = useState(0);
  const headingRef = useRef(0);
  const targetBearingRef = useRef<number | null>(null);
  const activeRouteEdgeRef = useRef<{from: string; to: string} | null>(null);
  const currentNodeIdRef = useRef<string | null>(null);
  const destinationOptionRef = useRef<string | null>(null);
  const stepCounterRef = useRef<StepCounterHandle | null>(null);
  const promptedQrNodesRef = useRef<Set<string>>(new Set());
  const wrongDirectionPromptedRef = useRef(false);
  const recalibrationPromptedRef = useRef(false);
  const arrivalPromptedRef = useRef(false);
  const spokenInstructionIndexRef = useRef<number>(-1);
  const arrivalAnnouncementDoneRef = useRef(false);
  const westCorridorPromptedRef = useRef(false);
  const eastCorridorPromptedRef = useRef(false);
  const ttsReadyRef = useRef(false);
  const ttsPromptShownRef = useRef(false);

  const promptEnableTts = useCallback(() => {
    if (Platform.OS !== 'android' || ttsPromptShownRef.current) {
      return;
    }
    ttsPromptShownRef.current = true;
    Alert.alert(
      'Metin Okuma Etkin Değil',
      'Sesli navigasyon için telefonunuzda metinden sese özelliğini etkinleştirin.',
      [
        {text: 'Sonra', style: 'cancel'},
        {
          text: 'Etkinleştir',
          onPress: async () => {
            try {
              if (typeof (Tts as any).requestInstallEngine === 'function') {
                await (Tts as any).requestInstallEngine();
                return;
              }
              if (typeof (Tts as any).requestInstallData === 'function') {
                await (Tts as any).requestInstallData();
                return;
              }
              if (typeof (Linking as any).sendIntent === 'function') {
                await (Linking as any).sendIntent('com.android.settings.TTS_SETTINGS');
              } else {
                await Linking.openSettings();
              }
            } catch (e) {
              console.warn('TTS enable prompt action failed:', e);
            }
          },
        },
      ],
    );
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!isVoiceEnabled) {
      return;
    }
    const ttsText = text
      .replace(/\(\s*~?\s*\d+(?:[.,]\d+)?\s*metre\s*\)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!ttsText) {
      return;
    }
    try {
      if (!ttsReadyRef.current) {
        await Tts.getInitStatus();
        ttsReadyRef.current = true;
      }
      Tts.stop();
      Tts.speak(ttsText);
    } catch (error) {
      promptEnableTts();
      console.warn('TTS unavailable:', error);
    }
  }, [promptEnableTts, isVoiceEnabled]);

  const currentNode: BuildingNode | undefined = useMemo(
    () => KAT0_BUILDING_MAP.nodes.find(n => n.id === currentNodeId),
    [currentNodeId],
  );

  const destinationNode: BuildingNode | undefined = useMemo(() => {
    if (!destinationNodeId) {
      return undefined;
    }
    return KAT0_BUILDING_MAP.nodes.find(n => n.id === destinationNodeId);
  }, [destinationNodeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStartupSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const permissionState = await checkCorePermissions();
      const ok = hasRequiredPermissions(permissionState);
      setPermissionsReady(ok);
      setShowPermissionModal(!ok);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!permissionsReady) {
      stepCounterRef.current?.stop();
      stepCounterRef.current = null;
      return;
    }
    if (stepCounterRef.current) {
      return;
    }

    stepCounterRef.current = startStepCounter({
      onStep: () => {
        setSensorSteps(prev => prev + 1);
        const target = targetBearingRef.current;
        if (target === null) {
          setRouteProgressSteps(prev => prev + 1);
          return;
        }

        const delta = Math.abs(angleDeltaSigned(headingRef.current, target));
        const activeEdge = activeRouteEdgeRef.current;
        const isN1ToN3 = activeEdge?.from === 'N1' && activeEdge?.to === 'N3';
        const isN3ToN1 = activeEdge?.from === 'N3' && activeEdge?.to === 'N1';
        const optionId = destinationOptionRef.current;
        const isWestCorridorMode = !!(
          optionId &&
          WEST_CORRIDOR_DESTINATIONS.has(optionId) &&
          activeEdge &&
          WEST_CORRIDOR_NODES.has(activeEdge.from) &&
          WEST_CORRIDOR_NODES.has(activeEdge.to)
        );
        const isEastCorridorMode = !!(
          currentNodeIdRef.current === 'N9' &&
          optionId &&
          EAST_CORRIDOR_DESTINATIONS.has(optionId) &&
          activeEdge &&
          !(activeEdge.from === 'N3' && activeEdge.to === 'N1') &&
          !(activeEdge.from === 'N1' && activeEdge.to === 'N3') &&
          EAST_CORRIDOR_NODES.has(activeEdge.from) &&
          EAST_CORRIDOR_NODES.has(activeEdge.to)
        );
        const westDelta = Math.abs(angleDeltaSigned(headingRef.current, 270));
        const eastDelta = Math.abs(angleDeltaSigned(headingRef.current, 90));
        const northDelta = Math.abs(angleDeltaSigned(headingRef.current, 0));
        const southDelta = Math.abs(angleDeltaSigned(headingRef.current, 180));
        const aligned = isN1ToN3
          ? delta <= N1_N3_ALIGNMENT_THRESHOLD_DEG && southDelta <= N1_N3_SOUTH_ALIGNMENT_DEG
          : isN3ToN1
            ? delta <= N3_N1_ALIGNMENT_THRESHOLD_DEG && northDelta <= N3_N1_NORTH_ALIGNMENT_DEG
          : isWestCorridorMode
            ? delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG && westDelta <= WEST_CORRIDOR_ALIGNMENT_DEG
            : isEastCorridorMode
              ? delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG && eastDelta <= WEST_CORRIDOR_ALIGNMENT_DEG
              : delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG;

        if (aligned) {
          if (isWestCorridorMode) {
            westCorridorPromptedRef.current = false;
          }
          if (isEastCorridorMode) {
            eastCorridorPromptedRef.current = false;
          }
          setRouteProgressSteps(prev => prev + 1);
          setWrongDirectionStreak(0);
          setDeviationScore(prev => Math.max(0, prev - 1));
        } else {
          if (isWestCorridorMode && !westCorridorPromptedRef.current) {
            westCorridorPromptedRef.current = true;
            setQrRecalibrationReason('N3 sonrası bu hatta batı yönünde ilerleyin.');
            setShowWrongDirectionModal(true);
            speakText('Batı yönünde kalın.');
          }
          if (isEastCorridorMode && !eastCorridorPromptedRef.current) {
            eastCorridorPromptedRef.current = true;
            setQrRecalibrationReason('N9 sonrası bu hatta doğu yönünde ilerleyin.');
            setShowWrongDirectionModal(true);
            speakText('Doğu yönünde kalın.');
          }
          setWrongDirectionStreak(prev => prev + 1);
          setDeviationScore(prev => prev + 1);
        }
      },
    });

    return () => {
      stepCounterRef.current?.stop();
      stepCounterRef.current = null;
    };
  }, [permissionsReady, speakText]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    const compass = startCompass({
      onHeading: setHeadingDeg,
    });

    return () => {
      compass.stop();
    };
  }, [permissionsReady]);

  const buildRouteFromNodeSequence = useCallback((sequence: string[]): RouteResult | null => {
    const nodesById = KAT0_BUILDING_MAP.nodes.reduce<Record<string, BuildingNode>>(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {},
    );
    const edgesByKey = KAT0_BUILDING_MAP.edges.reduce<
      Record<string, { from: string; to: string; steps: number; instruction: string }>
    >((acc, edge) => {
      acc[`${edge.from}->${edge.to}`] = edge;
      const reverseTargetName = nodesById[edge.from]?.name ?? edge.from;
      acc[`${edge.to}->${edge.from}`] = {
        from: edge.to,
        to: edge.from,
        steps: edge.steps,
        instruction: `${reverseTargetName} yönüne ilerleyin.`,
      };
      return acc;
    }, {});

    const routeSteps: RouteResult['steps'] = [];
    for (let i = 0; i < sequence.length - 1; i += 1) {
      const edge = edgesByKey[`${sequence[i]}->${sequence[i + 1]}`];
      if (!edge) {
        return null;
      }
      routeSteps.push(edge);
    }

    const routeNodes = sequence.map(id => nodesById[id]).filter(Boolean);
    if (routeNodes.length !== sequence.length) {
      return null;
    }

    return {
      nodes: routeNodes,
      steps: routeSteps,
      totalSteps: routeSteps.reduce((sum, step) => sum + step.steps, 0),
    };
  }, []);

  const getFixedRouteSequence = useCallback(
    (
      startNodeId: string,
      optionId: string | null,
      targetNodeId: string,
    ): string[] | null => {
      if (!optionId) {
        return null;
      }

      const fixedByStartAndOption: Record<string, string[]> = {
        // N10 (arka cikis) -> sabit hedef dizileri
        'N10|P01': ['N10', 'N5', 'N4', 'N3', 'N1'], // Rehberlik
        'N10|P02': ['N10', 'N5', 'N4', 'N3'], // Mudur Yrd 1
        'N10|P03': ['N10', 'N5', 'N6', 'N13'], // Ogretmenler (N2'ye ugramadan)
        'N10|P04': ['N10', 'N5', 'N6', 'N12'], // Depo
        'N10|P05': ['N10', 'N5', 'N6', 'N12', 'N11'], // Kutuphane
        'N10|P06': ['N10', 'N5', 'N6', 'N12', 'N11', 'N9'], // WC Kadin
        'N10|P07': ['N10', 'N5', 'N4', 'N3'], // Spor
        'N10|P08': ['N10', 'N5', 'N6', 'N7'], // Lab 1
        'N10|P09': ['N10', 'N5', 'N6', 'N7', 'N8'], // Lab 2
        'N10|P10': ['N10', 'N5', 'N6', 'N7', 'N8'], // Sef
        'N10|P11': ['N10', 'N5', 'N6'], // WC Erkek
        'N10|P12': ['N10', 'N5'], // Mudur Yrd 2
        'N10|P13': ['N10', 'N5'], // Mudur Yrd 3
        'N10|P14': ['N10'], // Hizmetli Sol
        'N10|P15': ['N10'], // Mudur Odasi
        'N10|P16': ['N10'], // Mudur Yrd 4
        'N10|P17': ['N10'], // Hizmetli Sag

        // N1 (ana giris) -> sabit hedef dizileri
        'N1|P01': ['N1', 'N3'],
        'N1|P02': ['N1', 'N3'],
        'N1|P03': ['N1', 'N3', 'N13'],
        'N1|P04': ['N1', 'N3', 'N13', 'N2', 'N12'],
        'N1|P05': ['N1', 'N3', 'N13', 'N2', 'N12', 'N11'],
        'N1|P06': ['N1', 'N3', 'N13', 'N2', 'N12', 'N11', 'N9'],
        'N1|P07': ['N1', 'N3'],
        // N1 girisinden lab/sef hedeflerinde N3'te batiya donup ust koridordan ilerle.
        'N1|P08': ['N1', 'N3', 'N13', 'N2', 'N8', 'N7'],
        'N1|P09': ['N1', 'N3', 'N13', 'N2', 'N8'],
        'N1|P10': ['N1', 'N3', 'N13', 'N2', 'N8'],
        'N1|P11': ['N1', 'N3', 'N6'],
        'N1|P12': ['N1', 'N3', 'N4', 'N5'],
        'N1|P13': ['N1', 'N3', 'N4', 'N5'],
        'N1|P14': ['N1', 'N3', 'N4', 'N5', 'N10'],
        'N1|P15': ['N1', 'N3', 'N4', 'N5', 'N10'],
        'N1|P16': ['N1', 'N3', 'N4', 'N5', 'N10'],
        'N1|P17': ['N1', 'N3', 'N4', 'N5', 'N10'],

        // N9 (koridor kapisi) -> sabit hedef dizileri
        'N9|P15': ['N9', 'N11', 'N12', 'N6', 'N5', 'N10'], // Mudur Odasi
        'N9|P06': ['N9'],
        'N9|P05': ['N9', 'N11'],
        'N9|P04': ['N9', 'N11', 'N12'],
        'N9|P03': ['N9', 'N11', 'N12', 'N2', 'N13'],
        'N9|P07': ['N9', 'N11', 'N12', 'N2', 'N13', 'N3'],
        'N9|P02': ['N9', 'N11', 'N12', 'N2', 'N13', 'N3'],
        'N9|P01': ['N9', 'N11', 'N12', 'N2', 'N13', 'N3', 'N1'],
        'N9|P11': ['N9', 'N11', 'N12', 'N6'],
        'N9|P08': ['N9', 'N11', 'N12', 'N2', 'N8', 'N7'],
        'N9|P10': ['N9', 'N11', 'N12', 'N2', 'N8'],
        'N9|P09': ['N9', 'N11', 'N12', 'N2', 'N8'],

        // Arka koridor / WC Kadin aksi (zigzag'i engellemek icin sabit)
        'N5|P06': ['N5', 'N6', 'N12', 'N11', 'N9'],
        'N6|P06': ['N6', 'N12', 'N11', 'N9'],
        'N12|P06': ['N12', 'N11', 'N9'],
        'N11|P06': ['N11', 'N9'],

        // N13 baslangici: N2 bati koridoru sabit akisi
        'N13|P04': ['N13', 'N2', 'N12'],
        'N13|P05': ['N13', 'N2', 'N12', 'N11'],
        'N13|P06': ['N13', 'N2', 'N12', 'N11', 'N9'],
        'N13|P08': ['N13', 'N2', 'N8', 'N7'],
        'N13|P10': ['N13', 'N2', 'N8'],
        'N13|P09': ['N13', 'N2', 'N8'],
      };

      const direct = fixedByStartAndOption[`${startNodeId}|${optionId}`];
      if (direct) {
        return direct;
      }

      // Start-bazli fallback sabit akıs
      if (startNodeId === 'N10') {
        const fallbackByTarget: Record<string, string[]> = {
          N1: ['N10', 'N5', 'N4', 'N3', 'N1'],
          N3: ['N10', 'N5', 'N4', 'N3'],
          N2: ['N10', 'N5', 'N6', 'N7', 'N8', 'N2'],
          N9: ['N10', 'N5', 'N6', 'N7', 'N8', 'N2', 'N12', 'N11', 'N9'],
          N6: ['N10', 'N5', 'N6'],
          N7: ['N10', 'N5', 'N6', 'N7'],
          N8: ['N10', 'N5', 'N6', 'N7', 'N8'],
          N4: ['N10', 'N5', 'N4'],
          N5: ['N10', 'N5'],
          N10: ['N10'],
        };
        return fallbackByTarget[targetNodeId] ?? null;
      }

      return null;
    },
    [],
  );

  useEffect(() => {
    if (currentNodeId && destinationNodeId) {
      const fixedSequence = getFixedRouteSequence(
        currentNodeId,
        destinationOptionId,
        destinationNodeId,
      );
      if (fixedSequence) {
        const fixedBySequence = buildRouteFromNodeSequence(fixedSequence);
        if (fixedBySequence) {
          setRoute(
            applyRouteTotalStepCalibration(
              fixedBySequence,
              currentNodeId,
              destinationOptionId,
            ),
          );
          setRouteProgressSteps(0);
          setDeviationScore(0);
          setWrongDirectionStreak(0);
          setQrRecalibrationReason(null);
          promptedQrNodesRef.current.clear();
          wrongDirectionPromptedRef.current = false;
          recalibrationPromptedRef.current = false;
          arrivalPromptedRef.current = false;
          spokenInstructionIndexRef.current = -1;
          arrivalAnnouncementDoneRef.current = false;
          westCorridorPromptedRef.current = false;
          eastCorridorPromptedRef.current = false;
          setShowArrivalModal(false);
          return;
        }
      }

      const forcedCheckpoints = getRearCorridorPolicyCheckpoints(
        currentNodeId,
        destinationNodeId,
      );
      const result =
        forcedCheckpoints && forcedCheckpoints.length > 0
          ? buildRouteViaCheckpoints(currentNodeId, destinationNodeId, forcedCheckpoints) ??
          findShortestRoute(KAT0_BUILDING_MAP, currentNodeId, destinationNodeId)
          : findShortestRoute(KAT0_BUILDING_MAP, currentNodeId, destinationNodeId);

      setRoute(
        result ? applyRouteTotalStepCalibration(result, currentNodeId, destinationOptionId) : null,
      );
      setRouteProgressSteps(0);
      setDeviationScore(0);
      setWrongDirectionStreak(0);
      setQrRecalibrationReason(null);
      promptedQrNodesRef.current.clear();
      wrongDirectionPromptedRef.current = false;
      recalibrationPromptedRef.current = false;
      arrivalPromptedRef.current = false;
      spokenInstructionIndexRef.current = -1;
      arrivalAnnouncementDoneRef.current = false;
      westCorridorPromptedRef.current = false;
      eastCorridorPromptedRef.current = false;
      setShowArrivalModal(false);
    }
  }, [
    currentNodeId,
    destinationNodeId,
    destinationOptionId,
    getFixedRouteSequence,
    buildRouteFromNodeSequence,
  ]);

  const requestPermissions = async () => {
    const next = await requestCorePermissions();
    const ok = hasRequiredPermissions(next);
    setPermissionsReady(ok);
    if (ok) {
      setShowPermissionModal(false);
    }
  };

  const resetNavigationState = useCallback(() => {
    setActiveScreen('home');
    setRoute(null);
    setCurrentNodeId(null);
    setDestinationNodeId(null);
    setDestinationOptionId(null);
    setSelectedDestinationLabel(null);
    setSelectedDestinationNearNodeId(null);
    setSelectedDestinationOffsetMeters(0);
    setSensorSteps(0);
    setRouteProgressSteps(0);
    setDeviationScore(0);
    setWrongDirectionStreak(0);
    setQrRecalibrationReason(null);
    setShowWrongDirectionModal(false);
    setShowQRModal(false);
    setShowArrivalModal(false);
    setShowDestinationModal(false);
    setIsVoiceEnabled(true);
    wrongDirectionPromptedRef.current = false;
    recalibrationPromptedRef.current = false;
    promptedQrNodesRef.current.clear();
    arrivalPromptedRef.current = false;
    spokenInstructionIndexRef.current = -1;
    arrivalAnnouncementDoneRef.current = false;
    westCorridorPromptedRef.current = false;
    eastCorridorPromptedRef.current = false;
    Tts.stop();
  }, []);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => {
      const next = !prev;
      if (!next) {
        Tts.stop();
      }
      return next;
    });
  }, []);

  const completedInstructionIndex = useMemo(() => {
    if (!route) {
      return -1;
    }

    let cumulative = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      cumulative += route.steps[i].steps;
      if (routeProgressSteps < cumulative) {
        return i;
      }
    }
    return route.steps.length - 1;
  }, [route, routeProgressSteps]);

  const hasArrived = useMemo(() => {
    if (!route) {
      return false;
    }
    return routeProgressSteps >= route.totalSteps;
  }, [route, routeProgressSteps]);

  const destinationOptions = useMemo<DestinationOption[]>(() => {
    const poiDestinations = KAT0_DATASET.pois.map(poi => ({
      id: poi.id,
      name: poi.name,
      floor: poi.floor,
      targetNodeId: poi.nearNodeId,
      nearNodeId: poi.nearNodeId,
      offsetMeters: poi.offsetMeters,
    }));

    // Kullanıcı listesinde kapı/node teknik adları yerine yalnızca POI hedefleri gösterilir.
    // Hizmetli odası tek seçenek olarak gösterilir.
    const result: DestinationOption[] = [];
    let hasHizmetli = false;
    for (const item of poiDestinations) {
      if (item.name.startsWith('Hizmetli Odası')) {
        if (hasHizmetli) {
          continue;
        }
        hasHizmetli = true;
        result.push({ ...item, name: 'Hizmetli Odası' });
        continue;
      }
      result.push(item);
    }
    return result;
  }, []);
  const qrStartOptions = KAT0_BUILDING_MAP.nodes.filter(node =>
    KAT0_QR_NODE_IDS.has(node.id),
  );

  const nodeCoordMap = useMemo(() => {
    return KAT0_DATASET.nodes.reduce<Record<string, { xPx: number; yPx: number }>>((acc, node) => {
      acc[node.id] = { xPx: node.xPx, yPx: node.yPx };
      return acc;
    }, {});
  }, []);

  const activeRouteEdge = useMemo(() => {
    if (!route || route.steps.length === 0) {
      return null;
    }
    if (routeProgressSteps >= route.totalSteps) {
      return null;
    }

    let cumulative = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      cumulative += route.steps[i].steps;
      if (routeProgressSteps < cumulative) {
        return route.steps[i];
      }
    }
    return route.steps[route.steps.length - 1];
  }, [route, routeProgressSteps]);

  const activeEdgeIndex = useMemo(() => {
    if (!route || route.steps.length === 0) {
      return -1;
    }
    let cumulative = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      cumulative += route.steps[i].steps;
      if (routeProgressSteps < cumulative) {
        return i;
      }
    }
    return route.steps.length - 1;
  }, [route, routeProgressSteps]);

  const pinPosition = useMemo(() => {
    if (
      route &&
      destinationOptionId &&
      routeProgressSteps >= route.totalSteps &&
      POI_PIN_OVERRIDES[destinationOptionId]
    ) {
      return POI_PIN_OVERRIDES[destinationOptionId];
    }

    if (!route || route.steps.length === 0) {
      if (!currentNodeId) {
        return null;
      }
      return nodeCoordMap[currentNodeId] ?? null;
    }

    const idx = activeEdgeIndex;
    if (idx < 0) {
      return null;
    }

    const edge = route.steps[idx];
    const from = nodeCoordMap[edge.from];
    const to = nodeCoordMap[edge.to];
    if (!from || !to) {
      return null;
    }

    const prevSteps = route.steps
      .slice(0, idx)
      .reduce((sum, step) => sum + step.steps, 0);
    const within = Math.max(routeProgressSteps - prevSteps, 0);
    const t = edge.steps > 0 ? Math.min(within / edge.steps, 1) : 1;

    return {
      xPx: from.xPx + (to.xPx - from.xPx) * t,
      yPx: from.yPx + (to.yPx - from.yPx) * t,
    };
  }, [
    route,
    activeEdgeIndex,
    routeProgressSteps,
    nodeCoordMap,
    currentNodeId,
    destinationOptionId,
  ]);

  const targetBearingDeg = useMemo(() => {
    if (!activeRouteEdge) {
      return null;
    }
    const from = nodeCoordMap[activeRouteEdge.from];
    const to = nodeCoordMap[activeRouteEdge.to];
    if (!from || !to) {
      return null;
    }
    return normalizeDeg(bearingFromPixels(from, to) + bearingOffsetDeg);
  }, [activeRouteEdge, nodeCoordMap, bearingOffsetDeg]);

  useEffect(() => {
    headingRef.current = headingDeg;
  }, [headingDeg]);

  useEffect(() => {
    targetBearingRef.current = targetBearingDeg;
  }, [targetBearingDeg]);

  useEffect(() => {
    currentNodeIdRef.current = currentNodeId;
  }, [currentNodeId]);

  useEffect(() => {
    destinationOptionRef.current = destinationOptionId;
  }, [destinationOptionId]);

  useEffect(() => {
    if (!activeRouteEdge) {
      activeRouteEdgeRef.current = null;
      return;
    }
    activeRouteEdgeRef.current = {
      from: activeRouteEdge.from,
      to: activeRouteEdge.to,
    };
  }, [activeRouteEdge]);

  useEffect(() => {
    if (hasArrived) {
      return;
    }
    if (!route) {
      return;
    }
    if (wrongDirectionStreak >= 5 && !wrongDirectionPromptedRef.current) {
      wrongDirectionPromptedRef.current = true;
      recalibrationPromptedRef.current = true;
      setShowWrongDirectionModal(true);
      speakText('Yanlış yönde ilerliyorsunuz.');
      setQrRecalibrationReason('5 adımdır ters yöndesiniz.');
      return;
    }
    const overflow = routeProgressSteps - route.totalSteps;
    if (
      wrongDirectionStreak >= 5 &&
      overflow >= 10 &&
      !recalibrationPromptedRef.current &&
      !wrongDirectionPromptedRef.current
    ) {
      recalibrationPromptedRef.current = true;
      setQrRecalibrationReason('Beklenen adım aşıldı. Konum doğrulaması gerekiyor.');
      setShowWrongDirectionModal(true);
    }
  }, [deviationScore, wrongDirectionStreak, route, routeProgressSteps, speakText, hasArrived]);

  useEffect(() => {
    if (wrongDirectionStreak === 0) {
      wrongDirectionPromptedRef.current = false;
    }
  }, [wrongDirectionStreak]);

  useEffect(() => {
    if (hasArrived) {
      return;
    }
    if (!route) {
      recalibrationPromptedRef.current = false;
      return;
    }
    const overflow = routeProgressSteps - route.totalSteps;
    if (wrongDirectionStreak === 0 && deviationScore < 3 && overflow < 10) {
      recalibrationPromptedRef.current = false;
    }
  }, [route, routeProgressSteps, wrongDirectionStreak, deviationScore, hasArrived]);

  useEffect(() => {
    if (hasArrived) {
      return;
    }
    if (!route || !activeRouteEdge) {
      return;
    }
    if (wrongDirectionStreak < 5 || wrongDirectionPromptedRef.current) {
      return;
    }
    const nextNodeId = activeRouteEdge.to;
    if (!KAT0_QR_NODE_IDS.has(nextNodeId) || promptedQrNodesRef.current.has(nextNodeId)) {
      return;
    }
    if (deviationScore < 3 || recalibrationPromptedRef.current) {
      return;
    }
    recalibrationPromptedRef.current = true;
    promptedQrNodesRef.current.add(nextNodeId);
    setQrRecalibrationReason(`Kritik nokta ${nextNodeId} yaklaşılıyor. QR ile doğrulama önerilir.`);
    setShowWrongDirectionModal(true);
  }, [activeRouteEdge, route, deviationScore, speakText, hasArrived, wrongDirectionStreak]);

  useEffect(() => {
    const setupTts = async () => {
      try {
        await Tts.getInitStatus();
        ttsReadyRef.current = true;
        try {
          await Tts.setDefaultLanguage('tr-TR');
        } catch (langError) {
          console.warn('tr-TR unavailable, fallback en-US:', langError);
          await Tts.setDefaultLanguage('en-US');
        }
        Tts.setDefaultRate(0.48);
        Tts.setDucking(true);
      } catch (error) {
        ttsReadyRef.current = false;
        promptEnableTts();
        console.warn('TTS setup skipped:', error);
      }
    };
    setupTts();
  }, [promptEnableTts]);

  useEffect(() => {
    if (activeScreen !== 'navigation' || !route) {
      spokenInstructionIndexRef.current = -1;
      return;
    }
    if (hasArrived) {
      return;
    }
    if (completedInstructionIndex < 0 || completedInstructionIndex >= route.steps.length) {
      return;
    }
    if (spokenInstructionIndexRef.current === completedInstructionIndex) {
      return;
    }
    const instruction = route.steps[completedInstructionIndex]?.instruction;
    if (!instruction) {
      return;
    }
    spokenInstructionIndexRef.current = completedInstructionIndex;
    speakText(instruction);
  }, [activeScreen, route, completedInstructionIndex, speakText, hasArrived]);

  useEffect(() => {
    if (!route) {
      arrivalPromptedRef.current = false;
      arrivalAnnouncementDoneRef.current = false;
      setShowArrivalModal(false);
      return;
    }
    if (routeProgressSteps < route.totalSteps) {
      return;
    }
    if (arrivalPromptedRef.current) {
      return;
    }
    arrivalPromptedRef.current = true;
    setShowArrivalModal(true);
    if (!arrivalAnnouncementDoneRef.current) {
      arrivalAnnouncementDoneRef.current = true;
      speakText('Hedefe vardınız.');
    }
  }, [route, routeProgressSteps, speakText]);

  const facingHint = useMemo(() => {
    if (targetBearingDeg === null) {
      return 'Hedefe ulaştınız. Konumunuzu kontrol edin.';
    }
    if (activeRouteEdge?.from === 'N1' && activeRouteEdge?.to === 'N3') {
      return 'Güney yönünde dümdüz ilerle.';
    }
    if (activeRouteEdge?.from === 'N3' && activeRouteEdge?.to === 'N1') {
      return 'Kuzey yönünde dümdüz ilerle.';
    }
    if (
      activeRouteEdge &&
      MID_CORRIDOR_NODES.has(activeRouteEdge.from) &&
      MID_CORRIDOR_NODES.has(activeRouteEdge.to)
    ) {
      return 'Dümdüz ilerle.';
    }
    const delta = angleDeltaSigned(headingDeg, targetBearingDeg);
    const turn = turnInstruction(delta);
    return `${turn}.`;
  }, [headingDeg, targetBearingDeg, activeRouteEdge]);

  const targetCardinal = useMemo(() => {
    if (targetBearingDeg === null) {
      return '-';
    }
    return bearingToCardinal(targetBearingDeg);
  }, [targetBearingDeg]);

  if (showStartupSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Image
        source={require('./assets/floorplans/katplan_prof.png')}
        style={styles.appBackgroundImage}
        resizeMode="cover"
      />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>EasyGo</Text>
          <Text style={styles.headerSubtitle}>İç Mekan Navigasyon</Text>
        </View>
        <View style={styles.headerActions}>
          {activeScreen === 'navigation' && (
            <TouchableOpacity style={styles.voiceButton} onPress={toggleVoice}>
              <Text style={styles.voiceIcon}>{isVoiceEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.hamburgerButton} onPress={openDrawer}>
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeScreen === 'navigation' && route ? (
        <NavigationSessionScreen
          route={route}
          progressSteps={routeProgressSteps}
          headingDeg={headingDeg}
          targetBearingDeg={targetBearingDeg}
          facingHint={facingHint}
          targetCardinal={targetCardinal}
          pinPosition={pinPosition}
          onBack={() => setActiveScreen('home')}
          onManualStep={() => {
            setSensorSteps(prev => prev + 1);
            const target = targetBearingRef.current;
            if (target === null) {
              setRouteProgressSteps(prev => prev + 1);
              return;
            }
            const delta = Math.abs(angleDeltaSigned(headingRef.current, target));
            const activeEdge = activeRouteEdgeRef.current;
            const isN1ToN3 = activeEdge?.from === 'N1' && activeEdge?.to === 'N3';
            const isN3ToN1 = activeEdge?.from === 'N3' && activeEdge?.to === 'N1';
            const optionId = destinationOptionRef.current;
            const isWestCorridorMode = !!(
              optionId &&
              WEST_CORRIDOR_DESTINATIONS.has(optionId) &&
              activeEdge &&
              WEST_CORRIDOR_NODES.has(activeEdge.from) &&
              WEST_CORRIDOR_NODES.has(activeEdge.to)
            );
            const isEastCorridorMode = !!(
              currentNodeIdRef.current === 'N9' &&
              optionId &&
              EAST_CORRIDOR_DESTINATIONS.has(optionId) &&
              activeEdge &&
              !(activeEdge.from === 'N3' && activeEdge.to === 'N1') &&
              !(activeEdge.from === 'N1' && activeEdge.to === 'N3') &&
              EAST_CORRIDOR_NODES.has(activeEdge.from) &&
              EAST_CORRIDOR_NODES.has(activeEdge.to)
            );
            const westDelta = Math.abs(angleDeltaSigned(headingRef.current, 270));
            const eastDelta = Math.abs(angleDeltaSigned(headingRef.current, 90));
            const northDelta = Math.abs(angleDeltaSigned(headingRef.current, 0));
            const southDelta = Math.abs(angleDeltaSigned(headingRef.current, 180));
            const aligned = isN1ToN3
              ? delta <= N1_N3_ALIGNMENT_THRESHOLD_DEG && southDelta <= N1_N3_SOUTH_ALIGNMENT_DEG
              : isN3ToN1
                ? delta <= N3_N1_ALIGNMENT_THRESHOLD_DEG && northDelta <= N3_N1_NORTH_ALIGNMENT_DEG
              : isWestCorridorMode
                ? delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG && westDelta <= WEST_CORRIDOR_ALIGNMENT_DEG
                : isEastCorridorMode
                  ? delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG && eastDelta <= WEST_CORRIDOR_ALIGNMENT_DEG
                  : delta <= DIRECTION_ALIGNMENT_THRESHOLD_DEG;
            if (aligned) {
              if (isWestCorridorMode) {
                westCorridorPromptedRef.current = false;
              }
              if (isEastCorridorMode) {
                eastCorridorPromptedRef.current = false;
              }
              setRouteProgressSteps(prev => prev + 1);
              setWrongDirectionStreak(0);
              setDeviationScore(prev => Math.max(0, prev - 1));
            } else {
              if (isWestCorridorMode && !westCorridorPromptedRef.current) {
                westCorridorPromptedRef.current = true;
                setQrRecalibrationReason('N3 sonrası bu hatta batı yönünde ilerleyin.');
                setShowWrongDirectionModal(true);
                speakText('Batı yönünde kalın.');
              }
              if (isEastCorridorMode && !eastCorridorPromptedRef.current) {
                eastCorridorPromptedRef.current = true;
                setQrRecalibrationReason('N9 sonrası bu hatta doğu yönünde ilerleyin.');
                setShowWrongDirectionModal(true);
                speakText('Doğu yönünde kalın.');
              }
              setWrongDirectionStreak(prev => prev + 1);
              setDeviationScore(prev => prev + 1);
            }
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.container,
            !currentNodeId && { flexGrow: 1, justifyContent: 'center' }
          ]}
          showsVerticalScrollIndicator={false}
        >

          {/* Başlangıç Noktası */}
          <View style={[styles.card, styles.startCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.iconText}>📍</Text>
              </View>
              <View style={styles.cardHeaderTextContainer}>
                <Text style={styles.sectionTitle}>Başlangıç Noktası</Text>
                <Text style={styles.sectionSubtitle}>Mevcut konumunuzu belirleyin</Text>
              </View>
            </View>

            <View style={styles.contentRow}>
              <View style={styles.textColumn}>
                <Text style={styles.statusLabel}>Konum Durumu</Text>
                <Text style={[styles.value, !currentNode && styles.valuePlaceholder]}>
                  {currentNode ? `${currentNode.name}\n(Kat ${currentNode.floor})` : 'Henüz Seçilmedi'}
                </Text>
                {!!qrRecalibrationReason && (
                  <Text style={styles.warning}>⚠️ {qrRecalibrationReason}</Text>
                )}
              </View>
              <View style={styles.actionColumn}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roundedButton,
                    styles.primaryButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={() => {
                    if (!permissionsReady) {
                      setShowPermissionModal(true);
                      return;
                    }
                    setShowQRModal(true);
                  }}>
                  <Text style={styles.buttonText}>{currentNode ? 'Değiştir' : 'QR Okut'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Hedef ve Rota */}
          {!!currentNodeId && (
            <View style={[styles.card, styles.targetCard]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.iconText}>🎯</Text>
                </View>
                <View style={styles.cardHeaderTextContainer}>
                  <Text style={styles.sectionTitle}>Hedef Seçimi</Text>
                  <Text style={styles.sectionSubtitle}>Gitmek istediğiniz yeri seçin</Text>
                </View>
              </View>

              <View style={styles.contentRow}>
                <View style={styles.textColumn}>
                  <Text style={styles.statusLabel}>Hedef Durumu</Text>
                  <Text style={[styles.value, !destinationNode && styles.valuePlaceholder]}>
                    {destinationNode
                      ? `${selectedDestinationLabel ?? destinationNode.name}\n(Kat ${destinationNode.floor})`
                      : 'Henüz Seçilmedi'}
                  </Text>
                  {!!route && (
                    <Text style={styles.routeHighlight}>
                      Tahmini: {route.totalSteps} adım
                    </Text>
                  )}
                </View>
                <View style={styles.actionColumn}>
                  <Pressable
                    style={({ pressed }) => [styles.roundedButton, styles.secondaryButton, pressed && styles.buttonPressed]}
                    onPress={() => {
                      if (!permissionsReady) {
                        setShowPermissionModal(true);
                        return;
                      }
                      setShowDestinationModal(true);
                    }}>
                    <Text style={styles.secondaryButtonText}>{destinationNode ? 'Değiştir' : 'Hedef Seç'}</Text>
                  </Pressable>
                </View>
              </View>

              {!!route && (
                <View style={styles.routeContainer}>
                  <Text style={styles.routeTitle}>Rota Adımları</Text>
                  {route.steps.map((step, index) => (
                    <View
                      key={`${step.from}-${step.to}-${index}`}
                      style={[
                        styles.routeStep,
                        index === completedInstructionIndex && styles.activeRouteStep,
                      ]}>
                      <View style={[styles.stepDot, index === completedInstructionIndex && styles.activeStepDot]} />
                      <Text style={[styles.routeText, index === completedInstructionIndex && styles.activeRouteText]}>
                        {step.instruction}
                      </Text>
                    </View>
                  ))}

                  <Pressable
                    style={({ pressed }) => [styles.button, styles.actionButton, pressed && styles.buttonPressed]}
                    onPress={() => {
                      if (!permissionsReady) {
                        setShowPermissionModal(true);
                        return;
                      }
                      setActiveScreen('navigation');
                    }}>
                    <Text style={styles.buttonText}>Navigasyonu Başlat</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {!permissionsReady && (
            <View style={styles.permissionWarning}>
              <Text style={styles.permissionWarningText}>
                ⚠️ İzin verilmediği için navigasyon özellikleri devre dışı.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <PermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermissions={requestPermissions}
      />

      <WrongDirectionModal
        visible={showWrongDirectionModal}
        wrongSteps={wrongDirectionStreak}
        onClose={() => {
          setShowWrongDirectionModal(false);
        }}
        onRecalibrate={() => {
          setShowWrongDirectionModal(false);
          if (!permissionsReady) {
            setShowPermissionModal(true);
          } else {
            setShowQRModal(true);
          }
        }}
      />

      <QRStartModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        nodes={qrStartOptions}
        onSelectNode={id => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setCurrentNodeId(id);
          setDeviationScore(0);
          setWrongDirectionStreak(0);
          setQrRecalibrationReason(null);
          wrongDirectionPromptedRef.current = false;
          recalibrationPromptedRef.current = false;
          arrivalPromptedRef.current = false;
          setShowArrivalModal(false);
          setShowQRModal(false);
        }}
      />

      <ArrivalModal
        visible={showArrivalModal}
        onRestart={resetNavigationState}
        onOpenQR={() => {
          setShowArrivalModal(false);
          if (!permissionsReady) {
            setShowPermissionModal(true);
            return;
          }
          setShowQRModal(true);
        }}
      />

      <DestinationModal
        visible={showDestinationModal}
        onClose={() => setShowDestinationModal(false)}
        destinations={destinationOptions.map(item => ({
          id: item.id,
          name: item.name,
          floor: item.floor,
        }))}
        onSelectDestination={id => {
          const selected = destinationOptions.find(item => item.id === id);
          if (!selected) {
            return;
          }
          setDestinationOptionId(selected.id);
          setDestinationNodeId(selected.targetNodeId);
          setSelectedDestinationLabel(selected.name);
          setSelectedDestinationNearNodeId(selected.nearNodeId);
          setSelectedDestinationOffsetMeters(selected.offsetMeters);
          setShowDestinationModal(false);
        }}
      />

      <FloorPlanUploadModal
        visible={showFloorPlanModal}
        onClose={() => setShowFloorPlanModal(false)}
        onAddAsset={payload => {
          addManualFloorPlanAsset(payload);
          setFloorPlans(getFloorPlanAssets());
        }}
      />

      {/* Hamburger Drawer Overlay */}
      {showHamburgerMenu && (
        <Animated.View style={[styles.drawerOverlay, { opacity: overlayAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </Animated.View>
      )}

      {/* Hamburger Drawer Menu */}
      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: drawerAnim }] }]}>
        <SafeAreaView style={styles.drawerSafeArea}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Menü</Text>
            <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerContent}>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeDrawer();
                setActiveScreen('home');
              }}
            >
              <View style={styles.drawerIconBox}>
                <Text style={styles.drawerItemIcon}>🏠</Text>
              </View>
              <Text style={styles.drawerItemText}>Anasayfa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => {
                closeDrawer();
                setTimeout(() => setShowFloorPlanModal(true), 300);
              }}
            >
              <View style={styles.drawerIconBox}>
                <Text style={styles.drawerItemIcon}>🗺️</Text>
              </View>
              <Text style={styles.drawerItemText}>Kat Planı Ekle</Text>
            </TouchableOpacity>

            {activeScreen === 'navigation' && (
              <TouchableOpacity
                style={[styles.drawerItem, {marginTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20}]}
                onPress={() => {
                  closeDrawer();
                  resetNavigationState();
                }}
              >
                <View style={[styles.drawerIconBox, {backgroundColor: '#FEE2E2'}]}>
                  <Text style={styles.drawerItemIcon}>⏹️</Text>
                </View>
                <Text style={[styles.drawerItemText, {color: '#EF4444'}]}>Navigasyonu Bitir</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  appBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: -50,
    bottom: 0,
    right: 0,
    opacity: 0.05,
    width: '140%',
    height: '140%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 40,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 22,
  },
  container: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 20,
  },
  cardHeaderTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  warning: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  routeHighlight: {
    color: '#0EA5E9',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  actionButton: {
    backgroundColor: '#0EA5E9',
    marginTop: 16,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 15,
  },
  routeContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeRouteStep: {
    backgroundColor: '#F0F9FF',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
    marginRight: 12,
  },
  activeStepDot: {
    backgroundColor: '#0EA5E9',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
  },
  activeRouteText: {
    color: '#0369A1',
    fontWeight: '600',
  },
  assetList: {
    marginBottom: 16,
    gap: 8,
  },
  assetItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assetItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  assetItemSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  permissionWarning: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  permissionWarningText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  hamburgerButton: {
    padding: 8,
  },
  hamburgerIcon: {
    fontSize: 28,
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  startCard: {
    borderWidth: 1,
    borderColor: '#E0F2FE',
    backgroundColor: '#FAFAF9',
  },
  targetCard: {
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFCF5',
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  textColumn: {
    flex: 1,
    marginRight: 12,
  },
  actionColumn: {
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valuePlaceholder: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  roundedButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 998,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  drawerCloseButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: '#64748B',
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  drawerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  drawerItemIcon: {
    fontSize: 18,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  }
});

export default App;

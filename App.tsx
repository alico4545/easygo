import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DestinationModal,
  FloorPlanUploadModal,
  PermissionModal,
  QRStartModal,
  WrongDirectionModal,
} from './src/components';
import {
  KAT0_BUILDING_MAP,
  KAT0_DATASET,
  KAT0_DESTINATION_IDS,
  KAT0_QR_NODE_IDS,
} from './src/data/floorplans';
import {findShortestRoute} from './src/services/pathfinding';
import {
  checkCorePermissions,
  hasRequiredPermissions,
  requestCorePermissions,
} from './src/services/permissions';
import {addManualFloorPlanAsset, getFloorPlanAssets} from './src/services/floorPlanRegistry';
import {
  angleDeltaSigned,
  bearingFromPixels,
  bearingToCardinal,
  startCompass,
  turnInstruction,
} from './src/services/compass';
import {startStepCounter, StepCounterHandle} from './src/services/stepCounter';
import {NavigationSessionScreen, SplashScreen} from './src/screens';
import {BuildingNode, RouteResult} from './src/types/navigation';

const POI_PIN_OVERRIDES: Record<string, {xPx: number; yPx: number}> = {
  // Mudur Yardimcisi Odasi 1 kapisi (koridor tarafi)
  P02: {xPx: 2310, yPx: 705},
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
  const [activeScreen, setActiveScreen] = useState<'home' | 'navigation'>('home');

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
  const promptedQrNodesRef = useRef<Set<string>>(new Set());
  const wrongDirectionPromptedRef = useRef(false);

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
    let stepCounter: StepCounterHandle | null = null;

    const bootstrap = async () => {
      const permissionState = await checkCorePermissions();
      const ok = hasRequiredPermissions(permissionState);
      setPermissionsReady(ok);
      setShowPermissionModal(!ok);

      if (ok) {
        stepCounter = startStepCounter({
          onStep: () => {
            setSensorSteps(prev => prev + 1);
            const target = targetBearingRef.current;
            if (target === null) {
              setRouteProgressSteps(prev => prev + 1);
              return;
            }

            const delta = Math.abs(angleDeltaSigned(headingRef.current, target));
            const aligned = delta <= 65;

            if (aligned) {
              setRouteProgressSteps(prev => prev + 1);
              setWrongDirectionStreak(0);
              setDeviationScore(prev => Math.max(0, prev - 1));
            } else {
              setWrongDirectionStreak(prev => prev + 1);
              setDeviationScore(prev => prev + 1);
            }
          },
        });
      }
    };

    bootstrap();

    return () => {
      stepCounter?.stop();
    };
  }, []);

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
      Record<string, {from: string; to: string; steps: number; instruction: string}>
    >((acc, edge) => {
      acc[`${edge.from}->${edge.to}`] = edge;
      const reverseTargetName = nodesById[edge.from]?.name ?? edge.from;
      acc[`${edge.to}->${edge.from}`] = {
        from: edge.to,
        to: edge.from,
        steps: edge.steps,
        instruction: `${reverseTargetName} yonune ilerleyin.`,
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
        'N10|P15': ['N10', 'N5'], // Mudur Odasi
        'N10|P16': ['N10'], // Mudur Yrd 4
        'N10|P17': ['N10'], // Hizmetli Sag

        // N1 (ana giris) -> sabit hedef dizileri
        'N1|P01': ['N1'],
        'N1|P02': ['N1', 'N3'],
        'N1|P03': ['N1', 'N3', 'N13'],
        'N1|P04': ['N1', 'N3', 'N6', 'N12'],
        'N1|P05': ['N1', 'N3', 'N6', 'N12', 'N11'],
        'N1|P06': ['N1', 'N3', 'N6', 'N12', 'N11', 'N9'],
        'N1|P07': ['N1', 'N3'],
        'N1|P08': ['N1', 'N3', 'N6', 'N7'],
        'N1|P09': ['N1', 'N3', 'N6', 'N7', 'N8'],
        'N1|P10': ['N1', 'N3', 'N6', 'N7', 'N8'],
        'N1|P11': ['N1', 'N3', 'N6'],
        'N1|P12': ['N1', 'N3', 'N4', 'N5'],
        'N1|P13': ['N1', 'N3', 'N4', 'N5'],
        'N1|P14': ['N1', 'N3', 'N4', 'N5', 'N10'],
        'N1|P15': ['N1', 'N3', 'N4', 'N5'],
        'N1|P16': ['N1', 'N3', 'N4', 'N5', 'N10'],
        'N1|P17': ['N1', 'N3', 'N4', 'N5', 'N10'],

        // N9 (koridor kapisi) -> sabit hedef dizileri
        'N9|P15': ['N9', 'N11', 'N12', 'N6', 'N5'], // Mudur Odasi
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
          setRoute(fixedBySequence);
          setRouteProgressSteps(0);
          setDeviationScore(0);
          setWrongDirectionStreak(0);
          setQrRecalibrationReason(null);
          promptedQrNodesRef.current.clear();
          wrongDirectionPromptedRef.current = false;
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

      setRoute(result);
      setRouteProgressSteps(0);
      setDeviationScore(0);
      setWrongDirectionStreak(0);
      setQrRecalibrationReason(null);
      promptedQrNodesRef.current.clear();
      wrongDirectionPromptedRef.current = false;
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
        result.push({...item, name: 'Hizmetli Odası'});
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
    return KAT0_DATASET.nodes.reduce<Record<string, {xPx: number; yPx: number}>>((acc, node) => {
      acc[node.id] = {xPx: node.xPx, yPx: node.yPx};
      return acc;
    }, {});
  }, []);

  const activeRouteEdge = useMemo(() => {
    if (!route || route.steps.length === 0) {
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
    return bearingFromPixels(from, to);
  }, [activeRouteEdge, nodeCoordMap]);

  useEffect(() => {
    headingRef.current = headingDeg;
  }, [headingDeg]);

  useEffect(() => {
    targetBearingRef.current = targetBearingDeg;
  }, [targetBearingDeg]);

  useEffect(() => {
    if (!route) {
      return;
    }
    if (wrongDirectionStreak >= 5 && !wrongDirectionPromptedRef.current) {
      wrongDirectionPromptedRef.current = true;
      setShowWrongDirectionModal(true);
      setQrRecalibrationReason('5 adimdir ters yondesiniz.');
      return;
    }
    const overflow = routeProgressSteps - route.totalSteps;
    if (overflow >= 10) {
      setQrRecalibrationReason('Beklenen adim asildi. Konum dogrulamasi gerekiyor.');
      setShowQRModal(true);
    }
  }, [deviationScore, wrongDirectionStreak, route, routeProgressSteps]);

  useEffect(() => {
    if (wrongDirectionStreak === 0) {
      wrongDirectionPromptedRef.current = false;
    }
  }, [wrongDirectionStreak]);

  useEffect(() => {
    if (!route || !activeRouteEdge) {
      return;
    }
    const nextNodeId = activeRouteEdge.to;
    if (!KAT0_QR_NODE_IDS.has(nextNodeId) || promptedQrNodesRef.current.has(nextNodeId)) {
      return;
    }
    if (deviationScore < 3) {
      return;
    }
    promptedQrNodesRef.current.add(nextNodeId);
    setQrRecalibrationReason(`Kritik nokta ${nextNodeId} yaklasiliyor. QR ile dogrulama onerilir.`);
    setShowQRModal(true);
  }, [activeRouteEdge, route, deviationScore]);

  const facingHint = useMemo(() => {
    if (targetBearingDeg === null) {
      return 'Hedefe ulaştınız. Konumunuzu kontrol edin.';
    }
    const delta = angleDeltaSigned(headingDeg, targetBearingDeg);
    const targetCardinal = bearingToCardinal(targetBearingDeg);
    const turn = turnInstruction(delta);
    return `${turn}. ${targetCardinal} yönünde ilerle.`;
  }, [headingDeg, targetBearingDeg]);

  const targetCardinal = useMemo(() => {
    if (targetBearingDeg === null) {
      return '-';
    }
    return bearingToCardinal(targetBearingDeg);
  }, [targetBearingDeg]);

  if (showStartupSplash) {
    return <SplashScreen />;
  }

  if (activeScreen === 'navigation' && route) {
    return (
      <>
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
            if (delta <= 65) {
              setRouteProgressSteps(prev => prev + 1);
              setWrongDirectionStreak(0);
              setDeviationScore(prev => Math.max(0, prev - 1));
            } else {
              setWrongDirectionStreak(prev => prev + 1);
              setDeviationScore(prev => prev + 1);
            }
          }}
        />
        <WrongDirectionModal
          visible={showWrongDirectionModal}
          wrongSteps={wrongDirectionStreak}
          onClose={() => {
            setShowWrongDirectionModal(false);
            setWrongDirectionStreak(0);
            wrongDirectionPromptedRef.current = false;
          }}
          onRecalibrate={() => {
            setShowWrongDirectionModal(false);
            setShowQRModal(true);
            wrongDirectionPromptedRef.current = false;
          }}
        />
        <QRStartModal
          visible={showQRModal}
          onClose={() => setShowQRModal(false)}
          nodes={qrStartOptions}
          onSelectNode={id => {
            setCurrentNodeId(id);
            setDeviationScore(0);
            setWrongDirectionStreak(0);
            setQrRecalibrationReason(null);
            wrongDirectionPromptedRef.current = false;
            setShowQRModal(false);
          }}
        />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>EasyGo İç Mekan Navigasyon (MVP)</Text>
        <Text style={styles.subtitle}>
          QR + Bina Krokisi + Nokta/Rota + Adım Algılama
        </Text>
        <Text style={styles.subtitle}>
          Aktif Plan: {KAT0_BUILDING_MAP.name} • Ölçek: {KAT0_DATASET.scale.source}
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1) Başlangıç Noktası</Text>
          {!!qrRecalibrationReason && (
            <Text style={styles.warning}>QR Uyarisi: {qrRecalibrationReason}</Text>
          )}
          <Text style={styles.value}>
            {currentNode ? `${currentNode.name} (Kat ${currentNode.floor})` : 'Henüz QR okutulmadı'}
          </Text>
          <Pressable
            style={[styles.button, !permissionsReady && styles.buttonDisabled]}
            onPress={() => setShowQRModal(true)}
            disabled={!permissionsReady}>
            <Text style={styles.buttonText}>QR Okut (Demo Simülasyon)</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2) Hedef ve Rota</Text>
          <Text style={styles.value}>
            {destinationNode
              ? `${selectedDestinationLabel ?? destinationNode.name} (Kat ${destinationNode.floor})`
              : 'Hedef seçilmedi'}
          </Text>
          <Pressable style={styles.button} onPress={() => setShowDestinationModal(true)}>
            <Text style={styles.buttonText}>Hedef Seç</Text>
          </Pressable>

          <Text style={styles.routeLabel}>
            {route
              ? `Toplam tahmini: ${route.totalSteps} adım`
              : 'Rota için başlangıç ve hedef seçin'}
          </Text>
          {!!route && (
            <Text style={styles.routeNodes}>
              Dugum sirasi: {route.nodes.map(n => n.id).join(' -> ')}
            </Text>
          )}
          {!!route && selectedDestinationNearNodeId && (
            <Text style={styles.routeNodes}>
              Kontrol noktasi: {selectedDestinationNearNodeId}
              {selectedDestinationOffsetMeters > 0
                ? ` -> Hedef son ${selectedDestinationOffsetMeters.toFixed(1)} m (~${Math.max(
                    1,
                    Math.round(selectedDestinationOffsetMeters / 0.72),
                  )} adim)`
                : ' (hedef node)'}
            </Text>
          )}

          {!!route &&
            route.steps.map((step, index) => (
              <View
                key={`${step.from}-${step.to}-${index}`}
                style={[
                  styles.routeStep,
                  index === completedInstructionIndex && styles.activeRouteStep,
                ]}>
                <Text style={styles.routeText}>{index + 1}. {step.instruction}</Text>
              </View>
            ))}
          {!!route && (
            <Pressable style={styles.button} onPress={() => setActiveScreen('navigation')}>
              <Text style={styles.buttonText}>Navigasyonu Başlat</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3) Adım Takibi (Sensör)</Text>
          <Text style={styles.value}>Sensörden okunan adım: {sensorSteps}</Text>
          <Text style={styles.value}>Rota boyunca adım: {routeProgressSteps}</Text>
          <Text style={styles.value}>Ters yon serisi: {wrongDirectionStreak}</Text>
          <Text style={styles.value}>Sapma skoru: {deviationScore}</Text>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              setSensorSteps(0);
              setRouteProgressSteps(0);
              setWrongDirectionStreak(0);
              setDeviationScore(0);
              setQrRecalibrationReason(null);
              wrongDirectionPromptedRef.current = false;
            }}>
            <Text style={styles.secondaryButtonText}>Adımları Sıfırla</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4) Kat Planı Kayıt Modülü</Text>
          <Text style={styles.helper}>
            Sonraki aşamada PNG/PDF dosya seçici buraya bağlanacak.
          </Text>
          <Pressable style={styles.button} onPress={() => setShowFloorPlanModal(true)}>
            <Text style={styles.buttonText}>Plan Ekle (Demo)</Text>
          </Pressable>
          {floorPlans.map(asset => (
            <Text key={asset.id} style={styles.assetItem}>
              Kat {asset.floor} • {asset.fileName} • {asset.source}
            </Text>
          ))}
        </View>

        {!permissionsReady && (
          <Text style={styles.warning}>
            İzin verilmediği sürece QR ve adım sayar modülü pasif kalır.
          </Text>
        )}
      </ScrollView>

      <PermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermissions={requestPermissions}
      />

      <QRStartModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        nodes={qrStartOptions}
        onSelectNode={id => {
          setCurrentNodeId(id);
          setDeviationScore(0);
          setWrongDirectionStreak(0);
          setQrRecalibrationReason(null);
          wrongDirectionPromptedRef.current = false;
          setShowQRModal(false);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef4f6',
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 42,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    color: '#334155',
    fontSize: 14,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  value: {
    fontSize: 14,
    color: '#334155',
  },
  button: {
    backgroundColor: '#1f6feb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  routeLabel: {
    color: '#0f172a',
    fontSize: 13,
    marginTop: 4,
  },
  routeNodes: {
    color: '#475569',
    fontSize: 12,
  },
  routeStep: {
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 10,
    padding: 8,
  },
  activeRouteStep: {
    borderColor: '#0ea5a5',
    backgroundColor: '#ecfeff',
  },
  routeText: {
    fontSize: 13,
    color: '#1e293b',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  helper: {
    fontSize: 13,
    color: '#475569',
  },
  assetItem: {
    fontSize: 12,
    color: '#334155',
  },
  warning: {
    color: '#b45309',
    fontSize: 12,
  },
});

export default App;

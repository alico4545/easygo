import React, {useEffect, useMemo, useState} from 'react';
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
} from './src/components';
import {KAT0_BUILDING_MAP, KAT0_DATASET, KAT0_DESTINATION_IDS} from './src/data/floorplans';
import {findShortestRoute} from './src/services/pathfinding';
import {
  checkCorePermissions,
  hasRequiredPermissions,
  requestCorePermissions,
} from './src/services/permissions';
import {addManualFloorPlanAsset, getFloorPlanAssets} from './src/services/floorPlanRegistry';
import {startStepCounter, StepCounterHandle} from './src/services/stepCounter';
import {NavigationSessionScreen} from './src/screens';
import {BuildingNode, RouteResult} from './src/types/navigation';

function App() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'navigation'>('home');

  const [permissionsReady, setPermissionsReady] = useState(false);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [destinationNodeId, setDestinationNodeId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);

  const [sensorSteps, setSensorSteps] = useState(0);
  const [routeProgressSteps, setRouteProgressSteps] = useState(0);
  const [floorPlans, setFloorPlans] = useState(getFloorPlanAssets());

  const currentNode: BuildingNode | undefined = useMemo(
    () => KAT0_BUILDING_MAP.nodes.find(n => n.id === currentNodeId),
    [currentNodeId],
  );

  const destinationNode: BuildingNode | undefined = useMemo(
    () => KAT0_BUILDING_MAP.nodes.find(n => n.id === destinationNodeId),
    [destinationNodeId],
  );

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
            setRouteProgressSteps(prev => prev + 1);
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
    if (currentNodeId && destinationNodeId) {
      const result = findShortestRoute(KAT0_BUILDING_MAP, currentNodeId, destinationNodeId);
      setRoute(result);
      setRouteProgressSteps(0);
    }
  }, [currentNodeId, destinationNodeId]);

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

  const destinationOptions = KAT0_BUILDING_MAP.nodes.filter(node =>
    KAT0_DESTINATION_IDS.has(node.id),
  );

  if (activeScreen === 'navigation' && route) {
    return (
      <NavigationSessionScreen
        route={route}
        progressSteps={routeProgressSteps}
        onBack={() => setActiveScreen('home')}
        onManualStep={() => {
          setSensorSteps(prev => prev + 1);
          setRouteProgressSteps(prev => prev + 1);
        }}
      />
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
              ? `${destinationNode.name} (Kat ${destinationNode.floor})`
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
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              setSensorSteps(0);
              setRouteProgressSteps(0);
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
        nodes={KAT0_BUILDING_MAP.nodes}
        onSelectNode={id => {
          setCurrentNodeId(id);
          setShowQRModal(false);
        }}
      />

      <DestinationModal
        visible={showDestinationModal}
        onClose={() => setShowDestinationModal(false)}
        destinations={destinationOptions}
        onSelectDestination={id => {
          setDestinationNodeId(id);
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

import React, {useMemo, useState} from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {RouteResult} from '../types/navigation';

type NavigationSessionScreenProps = {
  route: RouteResult;
  progressSteps: number;
  headingDeg: number;
  targetBearingDeg: number | null;
  facingHint: string;
  targetCardinal: string;
  pinPosition: {xPx: number; yPx: number} | null;
  photoHint?: {
    title: string;
    source: ImageSourcePropType;
  } | null;
  onBack: () => void;
  onManualStep: () => void;
};

const STEP_LENGTH_METERS = 0.72;
const CROKI_W = 2775;
const CROKI_H = 2172;

export function NavigationSessionScreen({
  route,
  progressSteps,
  headingDeg,
  targetBearingDeg,
  facingHint,
  targetCardinal,
  pinPosition,
  photoHint,
  onBack,
  onManualStep,
}: NavigationSessionScreenProps) {
  const [canvas, setCanvas] = useState({width: 1, height: 1});
  const [showLocationPhoto, setShowLocationPhoto] = useState(false);

  const totalSteps = route.totalSteps;
  const remainingSteps = Math.max(totalSteps - progressSteps, 0);
  const remainingMeters = remainingSteps * STEP_LENGTH_METERS;

  const activeInstruction = useMemo(() => {
    let cumulative = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      cumulative += route.steps[i].steps;
      if (progressSteps < cumulative) {
        return route.steps[i].instruction;
      }
    }
    return 'Hedefe ulasildi.';
  }, [route.steps, progressSteps]);

  const imageRect = useMemo(() => {
    const imageAspect = CROKI_W / CROKI_H;
    const canvasAspect = canvas.width / canvas.height;

    if (canvasAspect > imageAspect) {
      const drawHeight = canvas.height;
      const drawWidth = drawHeight * imageAspect;
      const offsetX = (canvas.width - drawWidth) / 2;
      return {x: offsetX, y: 0, width: drawWidth, height: drawHeight};
    }

    const drawWidth = canvas.width;
    const drawHeight = drawWidth / imageAspect;
    const offsetY = (canvas.height - drawHeight) / 2;
    return {x: 0, y: offsetY, width: drawWidth, height: drawHeight};
  }, [canvas.height, canvas.width]);

  const pin = useMemo(() => {
    if (!pinPosition) {
      return null;
    }

    return {
      left: imageRect.x + (pinPosition.xPx / CROKI_W) * imageRect.width,
      top: imageRect.y + (pinPosition.yPx / CROKI_H) * imageRect.height,
    };
  }, [pinPosition, imageRect]);

  const onMapLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setCanvas({width, height});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBanner}>
          <Text style={styles.bannerIcon}>➜</Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>{facingHint}</Text>
            <Text style={styles.bannerSub}>{activeInstruction}</Text>
          </View>
          <View style={styles.compassWrap}>
            <View style={styles.compassFace}>
              <View style={[styles.compassDial, {transform: [{rotate: `${-headingDeg}deg`}]}]}>
                {Array.from({length: 72}).map((_, i) => {
                  const angle = i * 5;
                  const major = i % 6 === 0;
                  const northTick = i === 0;
                  return (
                    <View
                      key={`tick-${i}`}
                      style={[
                        styles.tick,
                        northTick
                          ? styles.tickNorth
                          : major
                            ? styles.tickMajor
                            : styles.tickMinor,
                        {transform: [{rotate: `${angle}deg`}, {translateY: -36}]},
                      ]}
                    />
                  );
                })}
                <Text style={[styles.cardinal, styles.cardinalN]}>K</Text>
                <Text style={[styles.cardinal, styles.cardinalE]}>D</Text>
                <Text style={[styles.cardinal, styles.cardinalS]}>G</Text>
                <Text style={[styles.cardinal, styles.cardinalW]}>B</Text>
              </View>
              <View style={styles.centerDot} />
              <View style={styles.crossH} />
              <View style={styles.crossV} />
              <View style={styles.fixedTopMarker} />
            </View>
          </View>
        </View>

        <View style={styles.bottomStats}>
          <View style={styles.statCol}>
            <Text style={styles.statBig}>{Math.ceil(remainingMeters / 0.9)} dk</Text>
            <Text style={styles.statLabel}>tahmini</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statBig}>{remainingSteps}</Text>
            <Text style={styles.statLabel}>adim</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statBig}>{remainingMeters.toFixed(1)} m</Text>
            <Text style={styles.statLabel}>kalan</Text>
          </View>
        </View>

        <Text style={styles.compassMeta}>
          Bas: {Math.round(headingDeg)}° • Hedef: {targetBearingDeg === null ? '-' : `${Math.round(targetBearingDeg)}°`} ({targetCardinal})
        </Text>

        {!!photoHint && (
          <Pressable
            style={styles.photoToggle}
            onPress={() => setShowLocationPhoto(prev => !prev)}>
            <Text style={styles.photoToggleText}>
              {showLocationPhoto ? 'Bulundugum yer fotosunu gizle' : 'Bulundugum yerin resmini goster'}
            </Text>
          </Pressable>
        )}

        {!!photoHint && showLocationPhoto && (
          <View style={styles.photoCard}>
            <Text style={styles.photoTitle}>{photoHint.title}</Text>
            <Image source={photoHint.source} style={styles.photoImage} resizeMode="cover" />
          </View>
        )}

        <View style={styles.mapCard}>
          <ImageBackground
            source={require('../../assets/floorplans/screen_kat0.png')}
            resizeMode="contain"
            style={styles.mapImage}
            imageStyle={styles.mapImageInner}
            onLayout={onMapLayout}>
            {!!pin && (
              <View
                style={[
                  styles.pin,
                  {
                    left: pin.left - 10,
                    top: pin.top - 24,
                  },
                ]}
              />
            )}
          </ImageBackground>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.primary} onPress={onManualStep}>
            <Text style={styles.primaryText}>+1 Adim (Demo)</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onBack}>
            <Text style={styles.secondaryText}>Ana Ekrana Don</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0b2f45'},
  scroll: {flex: 1},
  container: {flexGrow: 1, padding: 12, paddingBottom: 28, gap: 10},
  topBanner: {
    backgroundColor: 'rgba(20,35,40,0.95)',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIcon: {color: '#fff', fontSize: 26, fontWeight: '800'},
  bannerTextWrap: {flex: 1},
  bannerTitle: {color: '#fff', fontSize: 17, fontWeight: '800'},
  bannerSub: {color: '#d6e5ec', fontSize: 13, marginTop: 2},
  compassWrap: {
    width: 108,
    height: 108,
    borderRadius: 18,
    backgroundColor: '#0b0f16',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  compassFace: {
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#0b0f16',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassDial: {
    width: 86,
    height: 86,
    borderRadius: 999,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    backgroundColor: '#f8fafc',
    borderRadius: 1,
  },
  tickMajor: {
    width: 2,
    height: 12,
  },
  tickNorth: {
    width: 3,
    height: 18,
    backgroundColor: '#ef4444',
  },
  tickMinor: {
    width: 1,
    height: 6,
  },
  cardinal: {
    position: 'absolute',
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 11,
    zIndex: 30,
    elevation: 30,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 1,
  },
  cardinalN: {
    top: 12,
    color: '#ef4444',
  },
  cardinalE: {
    right: 12,
    top: 37,
  },
  cardinalS: {
    bottom: 12,
  },
  cardinalW: {
    left: 12,
    top: 37,
  },
  crossH: {
    position: 'absolute',
    width: 18,
    height: 1,
    backgroundColor: '#e5e7eb',
    opacity: 0.85,
  },
  crossV: {
    position: 'absolute',
    width: 1,
    height: 18,
    backgroundColor: '#e5e7eb',
    opacity: 0.85,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  fixedTopMarker: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#f8fafc',
  },
  bottomStats: {
    backgroundColor: '#1f4f67',
    borderRadius: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCol: {alignItems: 'center'},
  statBig: {color: '#fff', fontSize: 22, fontWeight: '800'},
  statLabel: {color: '#d1e2eb', fontSize: 12},
  compassMeta: {color: '#c8dbe7', fontSize: 12, textAlign: 'center'},
  photoToggle: {
    backgroundColor: '#0f3d56',
    borderWidth: 1,
    borderColor: '#55839a',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  photoToggleText: {color: '#e4f1f7', fontWeight: '700'},
  photoCard: {
    backgroundColor: 'rgba(8,20,28,0.9)',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  photoTitle: {color: '#e2edf3', fontSize: 12, fontWeight: '700'},
  photoImage: {width: '100%', height: 150, borderRadius: 10},
  mapCard: {
    width: '100%',
    backgroundColor: '#e5eef4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#88a8bb',
    padding: 6,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    aspectRatio: CROKI_W / CROKI_H,
    alignSelf: 'center',
  },
  mapImageInner: {
    borderRadius: 10,
  },
  pin: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#0ea5e9',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 3},
    elevation: 5,
  },
  row: {gap: 10},
  primary: {
    backgroundColor: '#0a74ff',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: {color: '#fff', fontWeight: '700'},
  secondary: {
    backgroundColor: '#0f3d56',
    borderWidth: 1,
    borderColor: '#55839a',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: {color: '#e4f1f7', fontWeight: '700'},
});

import React, {useMemo, useState} from 'react';
import {
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
  SafeAreaView,
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
  onBack,
  onManualStep,
}: NavigationSessionScreenProps) {
  const [canvas, setCanvas] = useState({width: 1, height: 1});
  const headingToTargetDeg =
    targetBearingDeg === null ? 0 : ((targetBearingDeg - headingDeg + 540) % 360) - 180;

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
      <View style={styles.container}>
        <View style={styles.topBanner}>
          <Text style={[styles.bannerIcon, {transform: [{rotate: `${headingToTargetDeg}deg`}]}]}>
            ↑
          </Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>{facingHint}</Text>
            <Text style={styles.bannerSub}>{activeInstruction}</Text>
          </View>
        </View>

        <View style={styles.infoLayer}>
          <View style={styles.bottomStats}>
            <View style={styles.statCard}>
              <Text style={styles.statBigBlue}>{remainingMeters.toFixed(1)} m</Text>
              <View style={styles.statLabelRow}>
                <Text style={styles.statIcon}>📏</Text>
                <Text style={styles.statLabel}>HEDEFE KALAN</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statBigGreen}>{progressSteps}</Text>
              <View style={styles.statLabelRow}>
                <Text style={styles.statIcon}>👣</Text>
                <Text style={styles.statLabel}>ATILAN ADIM SAYISI</Text>
              </View>
            </View>
          </View>
          <View style={styles.rightCompassWrap}>
            <View style={styles.compassFace}>
              <View style={[styles.compassDial, {transform: [{rotate: `${-headingDeg}deg`}]}]}>
                {Array.from({length: 72}).map((_, i) => {
                  const angle = i * 5;
                  const major = i % 6 === 0;
                  const northTick = i === 0;
                  return (
                    <View
                      key={`tick-right-${i}`}
                      style={[
                        styles.tick,
                        northTick
                          ? styles.tickNorth
                          : major
                            ? styles.tickMajor
                            : styles.tickMinor,
                        {transform: [{rotate: `${angle}deg`}, {translateY: -44}]},
                      ]}
                    />
                  );
                })}
                <Text style={[styles.cardinal, styles.cardinalN]}>K</Text>
                <Text style={[styles.cardinal, styles.cardinalE]}>D</Text>
                <Text style={[styles.cardinal, styles.cardinalS]}>G</Text>
                <Text style={[styles.cardinal, styles.cardinalW]}>B</Text>
              </View>
              <View style={styles.crossH} />
              <View style={styles.crossV} />
              <View style={styles.centerDot} />
              <Text style={[styles.compassNeedle, {transform: [{rotate: `${headingToTargetDeg}deg`}]}]}>
                ↑
              </Text>
              <View style={styles.fixedTopMarker} />
            </View>
          </View>
        </View>

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0b2f45'},
  container: {flex: 1, padding: 12, gap: 10, paddingTop: 50},
  topBanner: {
    backgroundColor: 'rgba(20,35,40,0.95)',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,marginBottom: 50,
  },
  bannerIcon: {color: '#fff', fontSize: 26, fontWeight: '800'},
  bannerTextWrap: {flex: 1},
  bannerTitle: {color: '#fff', fontSize: 17, fontWeight: '800'},
  bannerSub: {color: '#d6e5ec', fontSize: 13, marginTop: 2},
  infoLayer: {flexDirection: 'row', alignItems: 'center', gap: 10},
  compassFace: {
    width: 104,
    height: 104,
    borderRadius: 999,
    backgroundColor: '#0b0f16',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compassDial: {
    width: 104,
    height: 104,
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
    top: 16,
    color: '#ef4444',
  },
  cardinalE: {
    right: 16,
    top: 46,
  },
  cardinalS: {
    bottom: 16,
  },
  cardinalW: {
    left: 16,
    top: 46,
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
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  compassNeedle: {
    position: 'absolute',
    color: '#ef4444',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  fixedTopMarker: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#f8fafc',
  },
  bottomStats: {flex: 1, flexDirection: 'row', gap: 10},
  statCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: '#0f2542',
    borderWidth: 1,
    borderColor: '#274d79',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statBigBlue: {color: '#5aa3ff', fontSize: 34, fontWeight: '800'},
  statBigGreen: {color: '#34d399', fontSize: 34, fontWeight: '800'},
  statLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 5},
  statIcon: {fontSize: 12},
  statLabel: {color: '#8ea9c5', fontSize: 11, fontWeight: '700'},
  rightCompassWrap: {
    width: 112,
    height: 112,
    borderRadius: 14,
    backgroundColor: '#081321',
    alignItems: 'center',
    justifyContent: 'center',
  },
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

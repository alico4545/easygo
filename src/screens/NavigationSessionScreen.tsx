import React, {useMemo, useState} from 'react';
import {
  ImageBackground,
  LayoutChangeEvent,
  Pressable,
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
    return 'Hedefe ulaşıldı.';
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
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerIconBox}>
          <Text style={[styles.bannerIcon, {transform: [{rotate: `${headingToTargetDeg}deg`}]}]}>
            ↑
          </Text>
        </View>
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>{facingHint}</Text>
          <Text style={styles.bannerSub}>{activeInstruction}</Text>
        </View>
      </View>

      {/* Info Layer */}
      <View style={styles.infoLayer}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}><Text style={styles.statIcon}>📏</Text></View>
            <View>
              <Text style={styles.statLabel}>KALAN MESAFE</Text>
              <Text style={styles.statValueBlue}>
                {remainingMeters.toFixed(1)} <Text style={styles.statUnit}>metre</Text>
              </Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#D1FAE5' }]}><Text style={styles.statIcon}>👣</Text></View>
            <View>
              <Text style={styles.statLabel}>ATILAN ADIM</Text>
              <Text style={styles.statValueGreen}>{progressSteps}</Text>
            </View>
          </View>
        </View>
        
        {/* Compass Widget */}
        <View style={styles.compassCard}>
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
                      {transform: [{rotate: `${angle}deg`}, {translateY: -34}]},
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
            <Text style={[styles.compassNeedle, {transform: [{rotate: `${headingToTargetDeg}deg`}]}]}>
              ↑
            </Text>
            <View style={styles.fixedTopMarker} />
          </View>
        </View>
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
        <View style={styles.mapRotateLayer}>
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
                    left: pin.left - 12,
                    top: pin.top - 28,
                  },
                ]}
              />
            )}
          </ImageBackground>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 16, 
    gap: 16,
    backgroundColor: '#F8FAFC',
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bannerIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bannerIcon: {
    color: '#2563EB',
    fontSize: 32,
    fontWeight: '800',
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bannerSub: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  infoLayer: {
    flexDirection: 'row',
    gap: 16,
  },
  statsContainer: {
    flex: 1,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statIcon: {
    fontSize: 16,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValueBlue: {
    color: '#0EA5E9',
    fontSize: 22,
    fontWeight: '800',
  },
  statValueGreen: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '800',
  },
  statUnit: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  compassCard: {
    width: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 8,
  },
  compassFace: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compassDial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  tickMajor: {
    width: 2,
    height: 8,
    backgroundColor: '#94A3B8',
  },
  tickNorth: {
    width: 3,
    height: 10,
    backgroundColor: '#EF4444',
  },
  tickMinor: {
    width: 1,
    height: 4,
  },
  cardinal: {
    position: 'absolute',
    color: '#64748B',
    fontWeight: '800',
    fontSize: 10,
    zIndex: 30,
  },
  cardinalN: {
    top: 10,
    color: '#EF4444',
  },
  cardinalE: {
    right: 10,
    top: 36,
  },
  cardinalS: {
    bottom: 10,
  },
  cardinalW: {
    left: 10,
    top: 36,
  },
  centerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  compassNeedle: {
    position: 'absolute',
    color: '#3B82F6',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
    textShadowColor: 'rgba(59, 130, 246, 0.3)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  fixedTopMarker: {
    position: 'absolute',
    top: -4,
    width: 4,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  mapCard: {
    flex: 1,
    minHeight: 280,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  mapImageInner: {
    borderRadius: 12,
  },
  mapRotateLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
});

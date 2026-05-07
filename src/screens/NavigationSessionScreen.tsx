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
          <Text style={styles.bannerIcon}>➜</Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>{facingHint}</Text>
            <Text style={styles.bannerSub}>{activeInstruction}</Text>
          </View>
          <View style={styles.compassWrap}>
            <View style={[styles.needle, {transform: [{rotate: `${headingDeg}deg`}]}]} />
            <View
              style={[
                styles.targetNeedle,
                {
                  transform: [{rotate: `${targetBearingDeg ?? headingDeg}deg`}],
                },
              ]}
            />
            <Text style={styles.compassN}>N</Text>
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
  container: {flex: 1, padding: 12, gap: 10},
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
    width: 58,
    height: 58,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#9ec6d8',
    backgroundColor: '#143747',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: '#ffffff',
    top: 10,
  },
  targetNeedle: {
    position: 'absolute',
    width: 4,
    height: 16,
    backgroundColor: '#38bdf8',
    top: 14,
  },
  compassN: {
    position: 'absolute',
    top: 2,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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

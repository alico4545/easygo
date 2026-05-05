import React, {useMemo} from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {RouteResult} from '../types/navigation';

type NavigationSessionScreenProps = {
  route: RouteResult;
  progressSteps: number;
  onBack: () => void;
  onManualStep: () => void;
};

const STEP_LENGTH_METERS = 0.72;

export function NavigationSessionScreen({
  route,
  progressSteps,
  onBack,
  onManualStep,
}: NavigationSessionScreenProps) {
  const totalSteps = route.totalSteps;
  const remainingSteps = Math.max(totalSteps - progressSteps, 0);
  const remainingMeters = remainingSteps * STEP_LENGTH_METERS;

  const activeIndex = useMemo(() => {
    let cumulative = 0;
    for (let i = 0; i < route.steps.length; i += 1) {
      cumulative += route.steps[i].steps;
      if (progressSteps < cumulative) {
        return i;
      }
    }
    return route.steps.length - 1;
  }, [route.steps, progressSteps]);

  const progress = totalSteps > 0 ? Math.min(progressSteps / totalSteps, 1) : 1;
  const activeInstruction = route.steps[activeIndex]?.instruction ?? 'Hedefe ulaştınız.';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Navigasyon</Text>
        <Text style={styles.big}>{remainingSteps} adım kaldı</Text>
        <Text style={styles.meters}>{remainingMeters.toFixed(1)} metre kaldı</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${progress * 100}%`}]} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aktif Yönerge</Text>
          <Text style={styles.instruction}>{activeInstruction}</Text>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.primary} onPress={onManualStep}>
            <Text style={styles.primaryText}>+1 Adım (Demo)</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={onBack}>
            <Text style={styles.secondaryText}>Ana Ekrana Dön</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#eef4f6'},
  container: {flex: 1, padding: 16, gap: 14},
  title: {fontSize: 22, fontWeight: '800', color: '#0f172a'},
  big: {fontSize: 30, fontWeight: '800', color: '#0b8f47'},
  meters: {fontSize: 16, color: '#334155'},
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#dbe4ef',
    overflow: 'hidden',
  },
  progressFill: {height: 12, backgroundColor: '#1f6feb'},
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {fontSize: 13, color: '#475569', marginBottom: 8},
  instruction: {fontSize: 17, color: '#0f172a', fontWeight: '700'},
  row: {gap: 10},
  primary: {
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryText: {color: '#fff', fontWeight: '700'},
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryText: {color: '#0f172a', fontWeight: '700'},
});

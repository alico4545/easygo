import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BaseModal} from '../common/BaseModal';

type ArrivalModalProps = {
  visible: boolean;
  onRestart: () => void;
  onOpenQR: () => void;
};

export function ArrivalModal({visible, onRestart, onOpenQR}: ArrivalModalProps) {
  return (
    <BaseModal visible={visible} title="Hedefe Vardınız" onClose={onRestart}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>✓</Text>
      </View>
      <Text style={styles.desc}>
        Navigasyon tamamlandı. Hedef noktasına ulaştınız.
      </Text>
      <View style={styles.helpBox}>
        <Text style={styles.helpTitle}>Hedef yanlış görünüyorsa</Text>
        <Text style={styles.helpText}>
          En yakın noktadan QR okutun ve konumunuzu yeniden doğrulayın.
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onRestart}>
          <Text style={styles.secondaryText}>Yeni Rota Başlat</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onOpenQR}>
          <Text style={styles.primaryText}>QR Oku</Text>
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  badgeIcon: {
    fontSize: 30,
    color: '#16A34A',
    fontWeight: '800',
  },
  desc: {
    fontSize: 15,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  helpBox: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  helpTitle: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  helpText: {
    color: '#1E3A8A',
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  secondaryText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#22C55E',
    shadowColor: '#16A34A',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

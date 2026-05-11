import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BaseModal} from '../common/BaseModal';

type WrongDirectionModalProps = {
  visible: boolean;
  wrongSteps: number;
  onClose: () => void;
  onRecalibrate: () => void;
};

export function WrongDirectionModal({
  visible,
  wrongSteps,
  onClose,
  onRecalibrate,
}: WrongDirectionModalProps) {
  return (
    <BaseModal visible={visible} title="Yanlış Yönde Yürüyüş" onClose={onClose}>
      <Text style={styles.desc}>
        {wrongSteps} adımdır hedef yönünün tersinde ilerliyorsunuz.
      </Text>
      <Text style={styles.help}>
        Konumu düzeltmek için en yakın QR noktasını okutmanız önerilir.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryText}>Devam Et</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onRecalibrate}>
          <Text style={styles.primaryText}>QR ile Doğrula</Text>
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 8,
  },
  help: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 20,
    lineHeight: 20,
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
    backgroundColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
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


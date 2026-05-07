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
    <BaseModal visible={visible} title="Yanlis Yonde Yuruyus" onClose={onClose}>
      <Text style={styles.desc}>
        {wrongSteps} adimdir hedef yonunun tersinde ilerliyorsunuz.
      </Text>
      <Text style={styles.help}>
        Konumu duzeltmek icin en yakin QR noktasini okutmaniz onerilir.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryText}>Devam Et</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={onRecalibrate}>
          <Text style={styles.primaryText}>QR ile Dogrula</Text>
        </Pressable>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
    marginBottom: 8,
  },
  help: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#93a7bc',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  secondaryText: {
    color: '#1e293b',
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#0ea5a5',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});


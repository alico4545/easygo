import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {BaseModal} from '../common/BaseModal';

type PermissionModalProps = {
  visible: boolean;
  onClose: () => void;
  onRequestPermissions: () => void;
};

export function PermissionModal({
  visible,
  onClose,
  onRequestPermissions,
}: PermissionModalProps) {
  return (
    <BaseModal visible={visible} title="Gerekli İzinler" onClose={onClose}>
      <Text style={styles.desc}>
        QR okuma için kamera, adım sayımı için hareket algılama izni gereklidir.
      </Text>
      <View style={styles.list}>
        <Text style={styles.item}>• Kamera izni</Text>
        <Text style={styles.item}>• Hareket / aktivite algılama izni</Text>
      </View>
      <Pressable style={styles.primaryBtn} onPress={onRequestPermissions}>
        <Text style={styles.primaryText}>İzinleri Ver</Text>
      </Pressable>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 10,
  },
  list: {
    marginBottom: 16,
    gap: 8,
  },
  item: {
    fontSize: 14,
    color: '#0f172a',
  },
  primaryBtn: {
    backgroundColor: '#0ea5a5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {BaseModal} from '../common/BaseModal';

type DestinationItem = {
  id: string;
  name: string;
  floor: number;
};

type DestinationModalProps = {
  visible: boolean;
  destinations: DestinationItem[];
  onClose: () => void;
  onSelectDestination: (id: string) => void;
};

export function DestinationModal({
  visible,
  destinations,
  onClose,
  onSelectDestination,
}: DestinationModalProps) {
  return (
    <BaseModal visible={visible} title="Hedef Seç" onClose={onClose}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {destinations.map(item => (
          <Pressable
            key={item.id}
            style={styles.item}
            onPress={() => onSelectDestination(item.id)}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.sub}>Kat: {item.floor}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  list: {gap: 8, paddingBottom: 4},
  scroll: {maxHeight: 320},
  item: {
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 10,
    padding: 10,
  },
  title: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});

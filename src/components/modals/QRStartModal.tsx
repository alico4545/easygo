import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {BuildingNode} from '../../types/navigation';
import {BaseModal} from '../common/BaseModal';

type QRStartModalProps = {
  visible: boolean;
  nodes: BuildingNode[];
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
};

export function QRStartModal({
  visible,
  nodes,
  onClose,
  onSelectNode,
}: QRStartModalProps) {
  return (
    <BaseModal visible={visible} title="QR Başlangıç Noktası" onClose={onClose}>
      <Text style={styles.desc}>
        Demo için QR içeriğini simüle ediyoruz. Gerçekte kamera ile QR okutulacak.
      </Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {nodes.map(node => (
          <Pressable
            key={node.id}
            style={styles.item}
            onPress={() => onSelectNode(node.id)}>
            <Text style={styles.itemTitle}>{node.name}</Text>
            <Text style={styles.itemSubtitle}>Kat {node.floor}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  desc: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  list: {
    gap: 8,
    paddingBottom: 4,
  },
  scroll: {
    maxHeight: 320,
  },
  item: {
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 10,
    padding: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#475569',
  },
});

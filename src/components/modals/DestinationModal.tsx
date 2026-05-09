import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
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

const normalizeSearch = (value: string): string =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function DestinationModal({
  visible,
  destinations,
  onClose,
  onSelectDestination,
}: DestinationModalProps) {
  const [query, setQuery] = useState('');

  const normalizedQuery = normalizeSearch(query);
  const hasMinChars = normalizedQuery.length >= 3;
  const filtered = useMemo(() => {
    if (!hasMinChars) {
      return [];
    }
    return destinations.filter(item => {
      const name = normalizeSearch(item.name);
      if (name.includes(normalizedQuery)) {
        return true;
      }
      // Kelime-bazli eslesme: "ogretmen" -> "ogretmenler"
      return name.split(' ').some(word => word.startsWith(normalizedQuery));
    });
  }, [destinations, hasMinChars, normalizedQuery]);

  return (
    <BaseModal visible={visible} title="Hedef Seç" onClose={onClose}>
      <Text style={styles.helper}>
        Gitmek istediğiniz yeri yazın. Örn: <Text style={styles.helperBold}>Müd.</Text>
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Hedef adı yazın..."
        placeholderTextColor="#94a3b8"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="default"
        inputMode="text"
        style={styles.input}
      />

      {!normalizedQuery ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Aramak için en az 3 harf yazın.</Text>
        </View>
      ) : !hasMinChars ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Lütfen en az 3 harf girin.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Eşleşen hedef bulunamadı.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
          {filtered.map(item => (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={() => {
                onSelectDestination(item.id);
                setQuery('');
              }}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>Kat: {item.floor}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 8,
  },
  helperBold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyWrap: {
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
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

import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
    <BaseModal visible={visible} title="Hedef Belirle" onClose={onClose} avoidKeyboard>
      <View style={styles.contentArea}>
        <Text style={styles.helper}>
          Gitmek istediğiniz noktayı arayın. Örn: <Text style={styles.helperBold}>Öğretmenler</Text>
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Hedef adı yazın..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            inputMode="text"
            style={styles.input}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.resultsContainer}>
          {!normalizedQuery ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}><Text style={styles.emptyIconText}>🎯</Text></View>
              <Text style={styles.emptyText}>Aramak için en az 3 harf yazın</Text>
            </View>
          ) : !hasMinChars ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}><Text style={styles.emptyIconText}>⏳</Text></View>
              <Text style={styles.emptyText}>Sonuçlar için yazmaya devam edin...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBox}><Text style={styles.emptyIconText}>👀</Text></View>
              <Text style={styles.emptyText}>Eşleşen hedef bulunamadı</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              {filtered.map(item => (
                <Pressable
                  key={item.id}
                  style={({pressed}) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => {
                    onSelectDestination(item.id);
                    setQuery('');
                  }}>
                  <View style={styles.itemIconBox}>
                    <Text style={styles.itemIconText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.itemTextContent}>
                    <Text style={styles.title}>{item.name}</Text>
                    <Text style={styles.sub}>Bulunduğu Kat: {item.floor}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 16,
  },
  contentArea: {
    flexShrink: 1,
  },
  helperBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  clearIcon: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  resultsContainer: {
    flexShrink: 1,
    minHeight: 140,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  scroll: {
    flexShrink: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  itemPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  itemTextContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 2,
  },
  sub: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: '#CBD5E1',
    fontWeight: '300',
    marginLeft: 8,
  },
});

import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput} from 'react-native';
import {BaseModal} from '../common/BaseModal';

type FloorPlanUploadModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddAsset: (payload: {
    floor: number;
    fileName: string;
    mimeType: 'image/png' | 'application/pdf' | 'unknown';
  }) => void;
};

export function FloorPlanUploadModal({
  visible,
  onClose,
  onAddAsset,
}: FloorPlanUploadModalProps) {
  const [floor, setFloor] = useState('0');
  const [fileName, setFileName] = useState('kat_plani.png');

  const resolveMimeType = (name: string): 'image/png' | 'application/pdf' | 'unknown' => {
    if (name.toLowerCase().endsWith('.png')) {
      return 'image/png';
    }
    if (name.toLowerCase().endsWith('.pdf')) {
      return 'application/pdf';
    }
    return 'unknown';
  };

  const handleSubmit = () => {
    onAddAsset({
      floor: Number(floor) || 0,
      fileName,
      mimeType: resolveMimeType(fileName),
    });
    onClose();
  };

  return (
    <BaseModal visible={visible} title="Kat Planı Ekle" onClose={onClose}>
      <Text style={styles.note}>
        Bu modül sonraki aşamada gerçek dosya seçiciye bağlanacak. Şu an demo metadata eklenir.
      </Text>
      <TextInput
        style={styles.input}
        value={floor}
        onChangeText={setFloor}
        keyboardType="number-pad"
        placeholder="Kat"
      />
      <TextInput
        style={styles.input}
        value={fileName}
        onChangeText={setFileName}
        placeholder="Dosya adı (or. zemin.pdf)"
      />
      <Pressable style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Kaydet</Text>
      </Pressable>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#0b8f47',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

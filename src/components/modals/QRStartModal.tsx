import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
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
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const scanLockRef = useRef(false);
  const nodeIdSet = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);
  const device = useCameraDevice('back');

  const parseNodeIdFromPayload = (raw: string): string | null => {
    const payload = raw.trim();
    const parts = payload.split('|');
    // Beklenen format: EG|okul-a|F0|N1
    if (parts.length >= 4 && parts[0] === 'EG') {
      const nodeId = parts[3]?.trim().toUpperCase();
      if (nodeIdSet.has(nodeId)) {
        return nodeId;
      }
    }
    // Sadece N1 gibi basit payload gelirse de kabul et
    const basic = payload.toUpperCase();
    if (nodeIdSet.has(basic)) {
      return basic;
    }
    return null;
  };

  const onReadCode = (raw: string) => {
    if (scanLockRef.current) {
      return;
    }
    const nodeId = parseNodeIdFromPayload(raw);
    if (!nodeId) {
      setScanMessage('Geçersiz QR. Lütfen EasyGo QR kodu okutun.');
      return;
    }

    scanLockRef.current = true;
    setScanMessage(`QR okundu: ${nodeId}`);
    onSelectNode(nodeId);
    setTimeout(() => {
      scanLockRef.current = false;
    }, 1200);
  };

  useEffect(() => {
    const ensurePermission = async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === 'granted') {
        setCameraPermissionGranted(true);
        return;
      }

      const nextStatus = await Camera.requestCameraPermission();
      setCameraPermissionGranted(nextStatus === 'granted');
    };

    if (visible) {
      ensurePermission();
    }
  }, [visible]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const raw = codes[0]?.value;
      if (raw) {
        onReadCode(raw);
      }
    },
  });

  return (
    <BaseModal visible={visible} title="QR Başlangıç Noktası" onClose={onClose}>
      <Text style={styles.desc}>
        Kamerayı QR koda tutun. Kod okununca başlangıç noktası otomatik seçilir.
      </Text>
      <View style={styles.cameraWrap}>
        {!cameraPermissionGranted ? (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderText}>
              Kamera izni gerekli. Lütfen izin verip tekrar deneyin.
            </Text>
          </View>
        ) : !device ? (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderText}>Kamera cihazı bulunamadı.</Text>
          </View>
        ) : (
          <Camera
            style={styles.camera}
            device={device}
            isActive={visible}
            codeScanner={codeScanner}
          />
        )}
      </View>
      {!!scanMessage && <Text style={styles.scanMessage}>{scanMessage}</Text>}
      <Text style={styles.fallbackTitle}>QR çalışmazsa elle seç:</Text>
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
  cameraWrap: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c9d8e6',
    backgroundColor: '#0b1220',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cameraPlaceholderText: {
    color: '#cbd5e1',
    textAlign: 'center',
    fontSize: 13,
  },
  scanMessage: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    color: '#0f766e',
    fontWeight: '600',
  },
  fallbackTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
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

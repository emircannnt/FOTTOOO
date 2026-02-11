import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteVideos,
  requestGalleryPermission,
  scanGallery,
  type VideoAsset
} from './src/services/mediaService';
import type { PhotoAssetItem } from './src/types';
import { createSizeBuckets, selectAllIds, toggleSelectedId } from './src/utils/videoLogic';

const APP_TITLE = 'Galeri Düzenleyici E.T';

type Stage = 'splash' | 'permission' | 'scanning' | 'results';
type TabKey = 'library' | 'important' | 'cleanup' | 'videos';

function bytesToMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderPhotoRows(photos: PhotoAssetItem[]) {
  if (!photos.length) {
    return <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>;
  }

  return photos.slice(0, 40).map((photo) => (
    <View style={styles.photoRow} key={photo.id}>
      <Text style={styles.photoName}>{photo.filename}</Text>
      <Text style={styles.photoTag}>{photo.classification.etiket}</Text>
    </View>
  ));
}

export default function App() {
  const [stage, setStage] = useState<Stage>('splash');
  const [activeTab, setActiveTab] = useState<TabKey>('library');
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [photos, setPhotos] = useState<PhotoAssetItem[]>([]);
  const [screenshots, setScreenshots] = useState<PhotoAssetItem[]>([]);
  const [cameraPhotos, setCameraPhotos] = useState<PhotoAssetItem[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const importantPhotos = useMemo(
    () => photos.filter((item) => item.classification.onem_durumu === 'ONEMLI'),
    [photos]
  );
  const cleanupPhotos = useMemo(
    () => photos.filter((item) => item.classification.onem_durumu === 'ONEMSIZ'),
    [photos]
  );

  const sizeBuckets = useMemo(() => createSizeBuckets(videos), [videos]);
  const allSelected = videos.length > 0 && selectedVideoIds.length === videos.length;

  const startPermissionFlow = () => setStage('permission');

  const allowAndScan = async () => {
    setLoading(true);
    setErrorMessage('');

    const granted = await requestGalleryPermission();
    if (!granted) {
      setLoading(false);
      setErrorMessage('Galeri izni verilmeden tarama başlatılamaz.');
      return;
    }

    setStage('scanning');

    try {
      const result = await scanGallery();
      setPhotos(result.photos);
      setScreenshots(result.screenshots);
      setCameraPhotos(result.cameraPhotos);
      setVideos(result.videos);
      setStage('results');
    } catch (error) {
      void error;
      setErrorMessage('Tarama sırasında hata oluştu. Lütfen tekrar deneyin.');
      setStage('permission');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => setSelectedVideoIds((prev) => toggleSelectedId(prev, id));
  const selectAll = () => setSelectedVideoIds(selectAllIds(videos));
  const clearSelection = () => setSelectedVideoIds([]);

  const deleteSelected = async () => {
    try {
      await deleteVideos(selectedVideoIds);
      setVideos((prev) => prev.filter((video) => !selectedVideoIds.includes(video.id)));
      clearSelection();
    } catch (error) {
      void error;
      setErrorMessage('Seçili videolar silinemedi.');
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {stage === 'splash' && (
          <View style={styles.centerBox}>
            <Text style={styles.title}>Akıllı Arşiv: Dijital Düzenleyiciniz</Text>
            <Text style={styles.subtitle}>{APP_TITLE}</Text>
            <Pressable style={styles.primaryButton} onPress={startPermissionFlow}>
              <Text style={styles.primaryButtonText}>Başla</Text>
            </Pressable>
          </View>
        )}

        <Modal visible={stage === 'permission'} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Galeri İzni</Text>
              <Text style={styles.modalText}>
                Galerinizdeki karmaşayı çözmemiz için okuma izni vermelisiniz.
              </Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setStage('splash')}>
                  <Text>Reddet</Text>
                </Pressable>
                <Pressable style={styles.primaryButton} onPress={allowAndScan}>
                  <Text style={styles.primaryButtonText}>İzin Ver</Text>
                </Pressable>
              </View>
              {loading && <ActivityIndicator style={styles.loader} />}
              {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </View>
          </View>
        </Modal>

        {stage === 'scanning' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" />
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.scanText}>Videolar boyutlarına göre diziliyor...</Text>
            <Text style={styles.scanText}>Fotoğraflar yapay zeka ile analiz ediliyor...</Text>
          </View>
        )}

        {stage === 'results' && (
          <View style={styles.resultsWrap}>
            <Text style={styles.title}>{APP_TITLE}</Text>
            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <View style={styles.tabRow}>
              {[
                ['library', 'Galeri'],
                ['important', 'Önemli'],
                ['cleanup', 'Temizlik'],
                ['videos', 'Videolar']
              ].map(([key, label]) => (
                <Pressable
                  key={key}
                  style={activeTab === key ? styles.tabActive : styles.tab}
                  onPress={() => setActiveTab(key as TabKey)}
                >
                  <Text>{label}</Text>
                </Pressable>
              ))}
            </View>

            {activeTab === 'library' && (
              <ScrollView style={styles.card}>
                <Text style={styles.cardTitle}>3 Ana Bölüm</Text>
                <Text style={styles.summaryLine}>Ekran Görüntüleri: {screenshots.length}</Text>
                <Text style={styles.summaryLine}>Diğer Fotoğraflar: {cameraPhotos.length}</Text>
                <Text style={styles.summaryLine}>Videolar: {videos.length}</Text>

                <Text style={styles.bucketTitle}>Ekran Görüntüleri</Text>
                {renderPhotoRows(screenshots)}

                <Text style={styles.bucketTitle}>Diğer Fotoğraflar</Text>
                {renderPhotoRows(cameraPhotos)}
              </ScrollView>
            )}

            {activeTab === 'important' && (
              <ScrollView style={styles.card}>
                <Text style={styles.cardTitle}>Önemli İçerikler</Text>
                <Text style={styles.summaryLine}>Toplam: {importantPhotos.length}</Text>
                {renderPhotoRows(importantPhotos)}
              </ScrollView>
            )}

            {activeTab === 'cleanup' && (
              <ScrollView style={styles.card}>
                <Text style={styles.cardTitle}>Önemsiz / Temizlik</Text>
                <Text style={styles.summaryLine}>Toplam: {cleanupPhotos.length}</Text>
                {renderPhotoRows(cleanupPhotos)}
              </ScrollView>
            )}

            {activeTab === 'videos' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Videolar (Büyükten Küçüğe)</Text>
                <View style={styles.actionsRow}>
                  <Pressable style={styles.secondaryButton} onPress={allSelected ? clearSelection : selectAll}>
                    <Text>{allSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, selectedVideoIds.length === 0 && styles.deleteButtonDisabled]}
                    onPress={deleteSelected}
                    disabled={selectedVideoIds.length === 0}
                  >
                    <Text style={styles.deleteText}>Sil</Text>
                  </Pressable>
                </View>

                <Text style={styles.bucketTitle}>En Üstte: &gt;1 GB ({sizeBuckets.top.length})</Text>
                <Text style={styles.bucketTitle}>Ortada: 100 MB - 500 MB ({sizeBuckets.mid.length})</Text>
                <Text style={styles.bucketTitle}>En Altta: &lt;10 MB ({sizeBuckets.low.length})</Text>

                <ScrollView style={styles.videoList}>
                  {!videos.length && <Text style={styles.emptyText}>Video bulunamadı.</Text>}
                  {videos.map((video) => {
                    const selected = selectedVideoIds.includes(video.id);
                    return (
                      <Pressable
                        key={video.id}
                        style={[styles.videoRow, selected && styles.videoRowSelected]}
                        onPress={() => toggleSelection(video.id)}
                      >
                        <Text style={styles.videoName}>{video.filename}</Text>
                        <Text>{bytesToMb(video.fileSize)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#4b5563' },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalText: { color: '#374151' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  loader: { marginTop: 8 },
  progressTrack: { width: '80%', height: 12, borderRadius: 999, backgroundColor: '#dbeafe', overflow: 'hidden' },
  progressFill: { width: '65%', height: '100%', backgroundColor: '#2563eb' },
  scanText: { fontSize: 15, color: '#374151' },
  errorText: { color: '#b91c1c' },
  resultsWrap: { flex: 1, padding: 16, gap: 12 },
  tabRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { backgroundColor: '#e5e7eb', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  tabActive: { backgroundColor: '#bfdbfe', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  summaryLine: { marginBottom: 6, color: '#374151' },
  bucketTitle: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
  photoRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  photoName: { flex: 1 },
  photoTag: { color: '#1d4ed8', fontWeight: '600' },
  emptyText: { color: '#6b7280', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  deleteButton: { backgroundColor: '#dc2626', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  deleteButtonDisabled: { opacity: 0.45 },
  deleteText: { color: '#fff', fontWeight: '700' },
  videoList: { marginTop: 8 },
  videoRow: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  videoRowSelected: { borderWidth: 1, borderColor: '#2563eb' },
  videoName: { maxWidth: '70%' }
});

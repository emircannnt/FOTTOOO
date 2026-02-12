import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { classifyImageWithPrompt } from './src/services/aiPrompt';
import {
  deleteMediaAssets,
  deleteVideos,
  loadPhotosFromGallery,
  loadVideosSortedBySize,
  requestGalleryPermission,
  type PhotoAsset,
  type VideoAsset
} from './src/services/mediaService';
import { createSizeBuckets, selectAllIds, toggleSelectedId } from './src/utils/videoLogic';

const APP_TITLE = 'Galeri Düzenleyici E.T';
const CLASSIFY_BATCH_SIZE = 120;

type Stage = 'splash' | 'permission' | 'scanning' | 'results';
type MainTabKey = 'screenshots' | 'photos' | 'videos';
type ImportanceTabKey = 'important' | 'unimportant' | null;

type ClassifiedImage = PhotoAsset & {
  importance: Exclude<ImportanceTabKey, null>;
  group: 'screenshots' | 'photos';
};

function bytesToMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImportanceLabel(importanceTab: ImportanceTabKey): string {
  if (importanceTab === 'important') {
    return 'Önemli';
  }
  if (importanceTab === 'unimportant') {
    return 'Önemsiz';
  }
  return '';
}

export default function App() {
  const [stage, setStage] = useState<Stage>('splash');
  const [activeMainTab, setActiveMainTab] = useState<MainTabKey>('screenshots');
  const [selectedImportanceByMainTab, setSelectedImportanceByMainTab] = useState<
    Record<'screenshots' | 'photos', ImportanceTabKey>
  >({
    screenshots: null,
    photos: null
  });
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [images, setImages] = useState<ClassifiedImage[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  const allVideosSelected = videos.length > 0 && selectedVideoIds.length === videos.length;
  const sizeBuckets = useMemo(() => createSizeBuckets(videos), [videos]);

  const groupedImages = useMemo(() => {
    const screenshots = images.filter((item) => item.group === 'screenshots');
    const photos = images.filter((item) => item.group === 'photos');

    return {
      screenshots: {
        important: screenshots.filter((item) => item.importance === 'important'),
        unimportant: screenshots.filter((item) => item.importance === 'unimportant')
      },
      photos: {
        important: photos.filter((item) => item.importance === 'important'),
        unimportant: photos.filter((item) => item.importance === 'unimportant')
      }
    };
  }, [images]);

  const startPermissionFlow = () => {
    setStage('permission');
  };

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
    setScanMessage('Videolar boyutlarına göre sıralanıyor...');

    try {
      const sortedVideos = await loadVideosSortedBySize();
      setScanMessage('Fotoğraflar galeriden alınıyor...');
      const galleryPhotos = await loadPhotosFromGallery();

      setScanMessage(`Fotoğraflar sınıflandırılıyor (0/${galleryPhotos.length})...`);

      const classifiedPhotos: ClassifiedImage[] = [];
      for (let i = 0; i < galleryPhotos.length; i += CLASSIFY_BATCH_SIZE) {
        const chunk = galleryPhotos.slice(i, i + CLASSIFY_BATCH_SIZE);
        const chunkClassified = await Promise.all(
          chunk.map(async (asset) => {
            const classification = await classifyImageWithPrompt({
              filename: asset.filename,
              width: asset.width,
              height: asset.height,
              uri: asset.uri
            });
            return {
              ...asset,
              group:
                classification.ana_kategori === 'EKRAN_GORUNTUSU' ? 'screenshots' : 'photos',
              importance:
                classification.onem_durumu === 'ONEMLI' ? 'important' : 'unimportant'
            } as ClassifiedImage;
          })
        );

        classifiedPhotos.push(...chunkClassified);
        setScanMessage(`Fotoğraflar sınıflandırılıyor (${classifiedPhotos.length}/${galleryPhotos.length})...`);
      }

      setVideos(sortedVideos);
      setImages(classifiedPhotos);
      setStage('results');
      setScanMessage('');
    } catch (error) {
      void error;
      setErrorMessage('Galeri taraması sırasında bir hata oluştu.');
      setStage('permission');
      setScanMessage('');
    } finally {
      setLoading(false);
    }
  };

  const activeImportanceTab =
    activeMainTab === 'screenshots' || activeMainTab === 'photos'
      ? selectedImportanceByMainTab[activeMainTab]
      : null;

  const activeImageList =
    activeMainTab === 'screenshots'
      ? activeImportanceTab
        ? groupedImages.screenshots[activeImportanceTab]
        : []
      : activeMainTab === 'photos'
        ? activeImportanceTab
          ? groupedImages.photos[activeImportanceTab]
          : []
        : [];

  const allImagesSelected =
    activeImageList.length > 0 &&
    activeImageList.every((image) => selectedImageIds.includes(image.id));

  const toggleVideoSelection = (id: string) => {
    setSelectedVideoIds((prev) => toggleSelectedId(prev, id));
  };

  const toggleImageSelection = (id: string) => {
    setSelectedImageIds((prev) => toggleSelectedId(prev, id));
  };

  const selectAllVideos = () => {
    setSelectedVideoIds(selectAllIds(videos));
  };

  const selectAllVisibleImages = () => {
    setSelectedImageIds((prev) => Array.from(new Set([...prev, ...selectAllIds(activeImageList)])));
  };

  const clearVideoSelection = () => {
    setSelectedVideoIds([]);
  };

  const clearImageSelection = () => {
    setSelectedImageIds([]);
  };

  const deleteSelectedVideos = () => {
    if (!selectedVideoIds.length) {
      return;
    }

    Alert.alert('Videoları Sil', `${selectedVideoIds.length} video kalıcı olarak silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteVideos(selectedVideoIds);
            setVideos((prev) => prev.filter((video) => !selectedVideoIds.includes(video.id)));
            clearVideoSelection();
          } catch (error) {
            void error;
            setErrorMessage('Seçili videolar silinemedi.');
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
  };

  const deleteSelectedImages = () => {
    if (!selectedImageIds.length) {
      return;
    }

    Alert.alert(
      activeMainTab === 'screenshots' ? 'Ekran Görüntülerini Sil' : 'Fotoğrafları Sil',
      `${selectedImageIds.length} öğe kalıcı olarak silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteMediaAssets(selectedImageIds);
              setImages((prev) => prev.filter((image) => !selectedImageIds.includes(image.id)));
              clearImageSelection();
            } catch (error) {
              void error;
              setErrorMessage('Seçili görseller silinemedi.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {stage === 'splash' && (
        <View style={styles.centerBox}>
          <Text style={styles.title}>Akıllı Arşiv: Dijital Düzenleyiciniz</Text>
          <Text style={styles.subtitle}>{APP_TITLE}</Text>
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyNoticeTitle}>Gizlilik Güvencesi</Text>
            <Text style={styles.privacyNoticeText}>
              Burada tamamen gizlidir: Fotoğraflarınız ve videolarınız hiçbir yere aktarılamaz.
            </Text>
          </View>
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
          <Text style={styles.scanText}>{scanMessage || 'Tarama hazırlanıyor...'}</Text>
        </View>
      )}

      {stage === 'results' && (
        <View style={styles.resultsWrap}>
          <Text style={styles.title}>{APP_TITLE}</Text>
          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.tabRow}>
            <Pressable
              style={activeMainTab === 'screenshots' ? styles.tabActive : styles.tab}
              onPress={() => {
                setActiveMainTab('screenshots');
                clearImageSelection();
              }}
            >
              <Text>Ekran Görüntüleri</Text>
            </Pressable>
            <Pressable
              style={activeMainTab === 'photos' ? styles.tabActive : styles.tab}
              onPress={() => {
                setActiveMainTab('photos');
                clearImageSelection();
              }}
            >
              <Text>Fotoğraflar</Text>
            </Pressable>
            <Pressable
              style={activeMainTab === 'videos' ? styles.tabActive : styles.tab}
              onPress={() => {
                setActiveMainTab('videos');
                clearImageSelection();
              }}
            >
              <Text>Videolar</Text>
            </Pressable>
          </View>

          {(activeMainTab === 'screenshots' || activeMainTab === 'photos') && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {activeMainTab === 'screenshots' ? 'Ekran Görüntüleri' : 'Fotoğraflar'}
              </Text>
              <Text style={styles.bucketMeta}>
                Önce filtre seçin. İçerikler doğrudan görünmez, Önemli/Önemsiz seçiminden sonra listelenir.
              </Text>

              <View style={styles.subTabRow}>
                <Pressable
                  style={activeImportanceTab === 'important' ? styles.subTabActive : styles.subTab}
                  onPress={() =>
                    setSelectedImportanceByMainTab((prev) => ({
                      ...prev,
                      [activeMainTab]: 'important'
                    }))
                  }
                >
                  <Text>Önemli</Text>
                </Pressable>
                <Pressable
                  style={activeImportanceTab === 'unimportant' ? styles.subTabActive : styles.subTab}
                  onPress={() =>
                    setSelectedImportanceByMainTab((prev) => ({
                      ...prev,
                      [activeMainTab]: 'unimportant'
                    }))
                  }
                >
                  <Text>Önemsiz</Text>
                </Pressable>
              </View>

              {activeImportanceTab === null ? (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.bucketMeta}>Listeyi görmek için bir alt filtre seçin.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={allImagesSelected ? clearImageSelection : selectAllVisibleImages}
                      disabled={isDeleting}
                    >
                      <Text>{allImagesSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.deleteButton, selectedImageIds.length === 0 && styles.deleteButtonDisabled]}
                      onPress={deleteSelectedImages}
                      disabled={selectedImageIds.length === 0 || isDeleting}
                    >
                      <Text style={styles.deleteText}>{isDeleting ? 'Siliniyor...' : 'Sil'}</Text>
                    </Pressable>
                  </View>

                  <ScrollView style={styles.videoList}>
                    <Text style={styles.bucketTitle}>{getImportanceLabel(activeImportanceTab)} İçerikler</Text>
                    <Text style={styles.bucketMeta}>{activeImageList.length} öğe</Text>
                    {activeImageList.map((item) => {
                      const selected = selectedImageIds.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.videoRow, selected && styles.videoRowSelected]}
                          onPress={() => toggleImageSelection(item.id)}
                        >
                          <Text style={styles.videoName}>{item.filename}</Text>
                          <Text>{bytesToMb(item.fileSize)}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {activeMainTab === 'videos' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Videolar (Büyükten Küçüğe)</Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={allVideosSelected ? clearVideoSelection : selectAllVideos}
                  disabled={isDeleting}
                >
                  <Text>{allVideosSelected ? 'Seçimi Temizle' : 'Tümünü Seç'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteButton, selectedVideoIds.length === 0 && styles.deleteButtonDisabled]}
                  onPress={deleteSelectedVideos}
                  disabled={selectedVideoIds.length === 0 || isDeleting}
                >
                  <Text style={styles.deleteText}>{isDeleting ? 'Siliniyor...' : 'Sil'}</Text>
                </Pressable>
              </View>

              <Text style={styles.bucketTitle}>En Üstte: &gt;1 GB</Text>
              <Text style={styles.bucketMeta}>{sizeBuckets.top.length} video</Text>
              <Text style={styles.bucketTitle}>Ortada: 100 MB - 1 GB</Text>
              <Text style={styles.bucketMeta}>{sizeBuckets.mid.length} video</Text>
              <Text style={styles.bucketTitle}>En Altta: &lt;100 MB</Text>
              <Text style={styles.bucketMeta}>{sizeBuckets.low.length} video</Text>

              <ScrollView style={styles.videoList}>
                {videos.map((video) => {
                  const selected = selectedVideoIds.includes(video.id);
                  return (
                    <Pressable
                      key={video.id}
                      style={[styles.videoRow, selected && styles.videoRowSelected]}
                      onPress={() => toggleVideoSelection(video.id)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb'
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937'
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563'
  },
  privacyNotice: {
    width: '100%',
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  privacyNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0c4a6e'
  },
  privacyNoticeText: {
    fontSize: 14,
    color: '#075985'
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  modalText: {
    color: '#374151'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  loader: {
    marginTop: 8
  },
  scanText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center'
  },
  progressTrack: {
    width: '80%',
    height: 12,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    overflow: 'hidden'
  },
  progressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#2563eb'
  },
  errorText: {
    color: '#b91c1c'
  },
  resultsWrap: {
    flex: 1,
    padding: 16,
    gap: 12
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8
  },
  tab: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  tabActive: {
    backgroundColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  subTab: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  subTabActive: {
    backgroundColor: '#c7d2fe',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  emptyStateBox: {
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f8fafc'
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 8
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  deleteButtonDisabled: {
    opacity: 0.45
  },
  deleteText: {
    color: '#fff',
    fontWeight: '700'
  },
  bucketTitle: {
    fontWeight: '700',
    marginTop: 6
  },
  bucketMeta: {
    color: '#6b7280'
  },
  videoList: {
    marginTop: 8
  },
  videoRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  videoRowSelected: {
    borderWidth: 1,
    borderColor: '#2563eb'
  },
  videoName: {
    maxWidth: '70%'
  }
});

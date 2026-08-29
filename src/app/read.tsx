// src/app/read.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// 直接引入！Metro 會自動識別 .native 或 .web
import PdfViewer from '../components/read';

const STORAGE_KEY_PROGRESS = '@reading_progress_local_book_1';

export default function ReadScreen() {
  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);

  const pdfUri = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const savedPage = await AsyncStorage.getItem(STORAGE_KEY_PROGRESS);
        if (savedPage) {
          const pageNum = parseInt(savedPage, 10);
          setInitialPage(pageNum);
          setCurrentPage(pageNum);
        } else {
          setInitialPage(1);
        }
      } catch (error) {
        setInitialPage(1);
      }
    };
    loadProgress();
  }, []);

  const handlePageChanged = async (page: number, numberOfPages: number) => {
    setCurrentPage(page);
    setTotalPages(numberOfPages);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PROGRESS, page.toString());
    } catch (error) {
      console.error('儲存進度失敗:', error);
    }
  };

  if (initialPage === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isNightMode && styles.darkContainer]}>
      <View style={[styles.toolbar, isNightMode && styles.darkToolbar]}>
        <Text style={[styles.pageText, isNightMode && styles.darkText]}>
          {Platform.OS === 'web' ? 'Web 模式預覽' : `頁數：${currentPage} / ${totalPages}`}
        </Text>

        <TouchableOpacity
          onPress={() => setIsNightMode(!isNightMode)}
          style={styles.toolBtn}
        >
          <Text style={[styles.btnText, isNightMode && styles.darkText]}>
            {isNightMode ? '☀️ 日間模式' : '🌙 夜間模式'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pdfWrapper}>
        <PdfViewer
          uri={pdfUri}
          page={initialPage}
          isNightMode={isNightMode}
          onPageChanged={handlePageChanged}
          onLoadComplete={(numberOfPages) => setTotalPages(numberOfPages)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  darkContainer: { backgroundColor: '#121212' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  toolbar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  darkToolbar: { backgroundColor: '#1E1E1E', borderBottomColor: '#333333' },
  pageText: { fontSize: 14, fontWeight: 'bold', color: '#333333' },
  btnText: { fontSize: 14, fontWeight: 'bold', color: '#333333' },
  darkText: { color: '#FFFFFF' },
  toolBtn: { padding: 6 },
  pdfWrapper: { flex: 1 },
});
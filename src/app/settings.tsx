import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';


export default function SettingsScreen() {
  // 設定狀態
  const [language, setLanguage] = useState<'zh_HK' | 'zh_TW' | 'en'>('zh_HK');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // 切換語言處理
  const handleLanguageChange = () => {
    Alert.alert(
      '選擇語言 / Select Language',
      '請選擇你偏好的應用程式語言：',
      [
        { text: '繁體中文 (香港)', onPress: () => setLanguage('zh_HK') },
        { text: '繁體中文 (台灣)', onPress: () => setLanguage('zh_TW') },
        { text: 'English', onPress: () => setLanguage('en') },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  // 顯示語言名稱
  const getLanguageLabel = () => {
    switch (language) {
      case 'zh_HK': return '繁體中文 (香港)';
      case 'zh_TW': return '繁體中文 (台灣)';
      case 'en': return 'English';
      default: return '繁體中文 (香港)';
    }
  };

  // 清除本地儲存資料
  const handleClearData = () => {
    Alert.alert(
      '⚠️ 重置所有資料',
      '確定要清除所有習慣、行程與金幣記錄嗎？此動作無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定重置',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('重置成功', '所有本地資料已成功清除，請重新啟動 App。');
            } catch (e) {
              Alert.alert('錯誤', '清除資料失敗。');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>⚙️ 系統設定</Text>

        {/* 偏好設定組 */}
        <Text style={styles.sectionHeader}>一般偏好</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLanguageChange}>
            <View style={styles.rowLeft}>
              <Ionicons name="language-outline" size={20} color="#00E676" style={styles.icon} />
              <Text style={styles.settingText}>語言 (Language)</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.valueText}>{getLanguageLabel()}</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#666" />
            </View>
          </TouchableOpacity>

          <View style={[styles.settingRow, styles.borderTop]}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={20} color="#00E676" style={styles.icon} />
              <Text style={styles.settingText}>深色模式 (Dark Theme)</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#333', true: '#00E676' }}
              thumbColor={darkMode ? '#000' : '#888'}
            />
          </View>
        </View>

        {/* 通知與反饋組 */}
        <Text style={styles.sectionHeader}>通知與反饋</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color="#00E676" style={styles.icon} />
              <Text style={styles.settingText}>開啟推送通知</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#333', true: '#00E676' }}
              thumbColor={notificationsEnabled ? '#000' : '#888'}
            />
          </View>

          <View style={[styles.settingRow, styles.borderTop]}>
            <View style={styles.rowLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color="#00E676" style={styles.icon} />
              <Text style={styles.settingText}>觸覺震動回饋 (Haptics)</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#333', true: '#00E676' }}
              thumbColor={hapticFeedback ? '#000' : '#888'}
            />
          </View>
        </View>

        {/* 資料管理與其他 */}
        <Text style={styles.sectionHeader}>資料與系統</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
            <View style={styles.rowLeft}>
              <Ionicons name="trash-bin-outline" size={20} color="#FF5252" style={styles.icon} />
              <Text style={[styles.settingText, { color: '#FF5252' }]}>重置與清除所有資料</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#666" />
          </TouchableOpacity>
        </View>

        {/* 版本資訊 */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Life Reset 66 v1.2.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 10, marginBottom: 10 },
  sectionHeader: { fontSize: 14, fontWeight: '600', color: '#888', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  borderTop: { borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 12 },
  settingText: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  valueText: { color: '#888', fontSize: 13, marginRight: 6 },
  versionContainer: { marginTop: 30, alignItems: 'center' },
  versionText: { color: '#555', fontSize: 12 },
});
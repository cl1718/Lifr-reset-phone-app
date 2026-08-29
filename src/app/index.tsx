import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert, 
  Platform, 
  Modal, 
  TextInput 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@life_reset_v4_data';

// 商店造型品項
const SHOP_ITEMS = [
  { id: 'hat_cap', name: '鴨舌帽', price: 50, icon: '🧢', type: 'hat' },
  { id: 'hat_magic', name: '魔法帽', price: 120, icon: '🎩', type: 'hat' },
  { id: 'hat_crown', name: '國王皇冠', price: 300, icon: '👑', type: 'hat' },
  { id: 'suit_hero', name: '英雄披風', price: 150, icon: '🦸', type: 'suit' },
];

export default function HomeScreen() {
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);
  const [day, setDay] = useState(1);
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(100);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [equippedHat, setEquippedHat] = useState<string>('🧑');

  // Modal 狀態
  const [showShopModal, setShowShopModal] = useState(false);
  const [showPomoModal, setShowPomoModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false); // 👈 1. 新增結算 Modal 狀態
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // 自訂任務 Modal 狀態
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitXp, setNewHabitXp] = useState('15');
  const [newHabitCoin, setNewHabitCoin] = useState('15');

  const [habits, setHabits] = useState([
    { id: 201, title: '番茄鐘專注工作 25 分鐘', xp: 20, coin: 20, icon: 'timer-outline', type: 'pomo', completed: false },
    { id: 202, title: '閱讀書籍 / 上傳文件 PDF', xp: 15, coin: 15, icon: 'book-outline', type: 'book', completed: false },
    { id: 203, title: '關閉螢幕 / 減少手機使用', xp: 15, coin: 15, icon: 'moon-outline', type: 'screen', completed: false },
  ]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (hasCompletedQuiz) saveData();
  }, [day, streak, xp, coins, habits, unlockedItems, equippedHat, hasCompletedQuiz]);

  // 番茄鐘倒數邏輯
  useEffect(() => {
    let interval: any = null;
    if (pomoActive && pomoTime > 0) {
      interval = setInterval(() => setPomoTime(prev => prev - 1), 1000);
    } else if (pomoTime === 0 && pomoActive) {
      setPomoActive(false);
      Alert.alert('🎉 專注完成！', '太棒了！你獲得了 20 XP 與 20 金幣！');
      addRewards(20, 20);
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoTime]);

  const saveData = async () => {
    try {
      const data = { hasCompletedQuiz, day, streak, xp, coins, habits, unlockedItems, equippedHat };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value) {
        const data = JSON.parse(value);
        setHasCompletedQuiz(data.hasCompletedQuiz || false);
        setDay(data.day || 1);
        setStreak(data.streak || 0);
        setXp(data.xp || 0);
        setCoins(data.coins ?? 100);
        if (data.unlockedItems) setUnlockedItems(data.unlockedItems);
        if (data.equippedHat) setEquippedHat(data.equippedHat);
        if (data.habits) setHabits(data.habits);
      }
    } catch (e) { console.error(e); }
  };

  const addRewards = (gainedXp: number, gainedCoin: number) => {
    setXp(prev => prev + gainedXp);
    setCoins(prev => prev + gainedCoin);
  };

  // 👈 2. 處理進入下一天並更新狀態的核心邏輯
  const handleConfirmNextDay = () => {
    setDay(prevDay => prevDay + 1);
    setStreak(prevStreak => prevStreak + 1);
    
    // 重置所有習慣的完成狀態，供新的一天繼續使用
    setHabits(prevHabits => 
      prevHabits.map(h => ({ ...h, completed: false }))
    );

    setShowSummaryModal(false);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAddHabit = () => {
    if (!newHabitTitle.trim()) {
      Alert.alert('提示', '請輸入任務名稱');
      return;
    }

    const xpVal = parseInt(newHabitXp, 10) || 10;
    const coinVal = parseInt(newHabitCoin, 10) || 10;

    const newHabit = {
      id: Date.now(),
      title: newHabitTitle.trim(),
      xp: xpVal,
      coin: coinVal,
      icon: 'checkbox-outline',
      type: 'custom',
      completed: false,
    };

    setHabits(prev => [...prev, newHabit]);
    setNewHabitTitle('');
    setNewHabitXp('15');
    setNewHabitCoin('15');
    setShowAddHabitModal(false);
  };

  const handleDeleteHabit = (id: number, title: string) => {
    Alert.alert(
      '刪除任務',
      `確定要刪除「${title}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '刪除', 
          style: 'destructive', 
          onPress: () => setHabits(prev => prev.filter(h => h.id !== id)) 
        }
      ]
    );
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileName = result.assets[0].name;
        setSelectedBook(fileName);
        Alert.alert('📚 成功載入書籍', `已選擇檔案：${fileName}\n祝你閱讀愉快！`);
      }
    } catch (err) {
      console.error('Pick document error:', err);
    }
  };

  const buyOrEquip = (item: typeof SHOP_ITEMS[0]) => {
    if (unlockedItems.includes(item.id)) {
      setEquippedHat(item.icon);
    } else {
      if (coins >= item.price) {
        setCoins(prev => prev - item.price);
        setUnlockedItems(prev => [...prev, item.id]);
        setEquippedHat(item.icon);
        Alert.alert('🎉 解鎖成功', `你成功購買了【${item.name}】！`);
      } else {
        Alert.alert('💰 金幣不足', '繼續完成每日任務賺取金幣吧！');
      }
    }
  };

  const level = Math.floor(xp / 100) + 1;
  const formatPomoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleHabit = (id: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHabits(habits.map(h => {
      if (h.id === id) {
        const nextState = !h.completed;
        if (nextState) addRewards(h.xp, h.coin);
        return { ...h, completed: nextState };
      }
      return h;
    }));
  };

  const completedCount = habits.filter(h => h.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>Life Reset 66</Text>

        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarHat}>{equippedHat}</Text>
          </View>
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.avatarLevel}>Lv.{level} 重置冒險者</Text>
            <Text style={styles.avatarCoin}>💰 {coins} 金幣  |  ⚡ {xp} XP</Text>
            <Text style={styles.streakText}>🔥 連續堅持：{streak} 天</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => setShowShopModal(true)}>
              <Text style={styles.shopBtnText}>🛍️ 造型商店</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Day {day} 習慣訓練</Text>
          <TouchableOpacity 
            style={styles.addHabitBtn} 
            onPress={() => setShowAddHabitModal(true)}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.addHabitBtnText}>新增習慣</Text>
          </TouchableOpacity>
        </View>

        {habits.map(item => (
          <View key={item.id} style={[styles.habitItem, item.completed && styles.habitItemDone]}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => toggleHabit(item.id)}
            >
              <Ionicons 
                name={item.completed ? "checkmark-circle" : (item.icon as any)} 
                size={24} 
                color={item.completed ? "#00E676" : "#FFF"} 
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitText, item.completed && styles.habitTextDone]}>
                  {item.title}
                </Text>
                <Text style={styles.rewardText}>
                  +{item.xp} XP  |  +{item.coin} 金幣
                </Text>
                {item.type === 'book' && selectedBook && (
                  <Text style={styles.subFileText}>📄 當前書籍: {selectedBook}</Text>
                )}
              </View>
            </TouchableOpacity>

            {item.type === 'pomo' && (
              <TouchableOpacity style={styles.actionBadge} onPress={() => setShowPomoModal(true)}>
                <Text style={styles.actionBadgeText}>⏱️ 開始</Text>
              </TouchableOpacity>
            )}

            {item.type === 'book' && (
              <TouchableOpacity style={styles.actionBadge} onPress={pickDocument}>
                <Text style={styles.actionBadgeText}>📁 選擇PDF</Text>
              </TouchableOpacity>
            )}

            {item.type === 'custom' && (
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={() => handleDeleteHabit(item.id, item.title)}
              >
                <Ionicons name="trash-outline" size={18} color="#FF5252" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* 👈 3. 按鈕正確顯示 Day {day}，點擊打開結算彈窗 */}
        <TouchableOpacity style={styles.finishBtn} onPress={() => setShowSummaryModal(true)}>
          <Text style={styles.finishBtnText}>完成今天並進入 Day {day + 1}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 👈 4. 新增「夏天/每日結算 Modal」 */}
      <Modal visible={showSummaryModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Text style={styles.summaryEmoji}>🌅</Text>
            <Text style={styles.modalTitle}>Day {day} 今日結算</Text>
            <Text style={styles.summaryDetailText}>
              今天你總共完成了 {completedCount} / {habits.length} 個習慣！
            </Text>
            <Text style={styles.summaryDetailText}>
              保持節奏，明天繼續邁向更好的自己。
            </Text>

            <TouchableOpacity 
              style={[styles.finishBtn, { width: '100%', marginTop: 20 }]} 
              onPress={handleConfirmNextDay}
            >
              <Text style={styles.finishBtnText}>確認完成，進入 Day {day + 1}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 新增習慣 Modal */}
      <Modal visible={showAddHabitModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✨ 新增自訂習慣</Text>
            <Text style={styles.inputLabel}>習慣名稱</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：每天喝水 2000cc"
              placeholderTextColor="#666"
              value={newHabitTitle}
              onChangeText={setNewHabitTitle}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 0.48 }}>
                <Text style={styles.inputLabel}>經驗值 (XP)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newHabitXp}
                  onChangeText={setNewHabitXp}
                />
              </View>
              <View style={{ flex: 0.48 }}>
                <Text style={styles.inputLabel}>金幣獎勵</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newHabitCoin}
                  onChangeText={setNewHabitCoin}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 15 }}>
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, { backgroundColor: '#333', marginRight: 10 }]} 
                onPress={() => setShowAddHabitModal(false)}
              >
                <Text style={styles.modalSubmitText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, { backgroundColor: '#00E676' }]} 
                onPress={handleAddHabit}
              >
                <Text style={[styles.modalSubmitText, { color: '#000' }]}>建立習慣</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 商店 Modal */}
      <Modal visible={showShopModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🛍️ 造型商店 (擁有 💰{coins} 金幣)</Text>
            <ScrollView>
              {SHOP_ITEMS.map(item => {
                const isBought = unlockedItems.includes(item.id);
                const isEquipped = equippedHat === item.icon;
                return (
                  <View key={item.id} style={styles.shopItemRow}>
                    <Text style={{ fontSize: 32 }}>{item.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.shopItemName}>{item.name}</Text>
                      <Text style={styles.shopItemPrice}>{isBought ? '已擁有' : `💰 ${item.price} 金幣`}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.buyBtn, isEquipped && { backgroundColor: '#333' }]}
                      onPress={() => buyOrEquip(item)}
                    >
                      <Text style={styles.buyBtnText}>
                        {isEquipped ? '裝備中' : isBought ? '穿戴' : '購買'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowShopModal(false)}>
              <Text style={styles.closeBtnText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 番茄鐘 Modal */}
      <Modal visible={showPomoModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>🍅 番茄鐘專注</Text>
            <Text style={styles.timerText}>{formatPomoTime(pomoTime)}</Text>
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity 
                style={styles.pomoControlBtn} 
                onPress={() => setPomoActive(!pomoActive)}
              >
                <Text style={styles.finishBtnText}>{pomoActive ? '暫停' : '開始專注'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pomoControlBtn, { backgroundColor: '#444', marginLeft: 10 }]} 
                onPress={() => { setPomoActive(false); setPomoTime(25 * 60); }}
              >
                <Text style={styles.finishBtnText}>重置</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPomoModal(false)}>
              <Text style={styles.closeBtnText}>返回習慣列表</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 10 },
  avatarCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 18, borderRadius: 16, marginVertical: 15 },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#00E676', justifyContent: 'center', alignItems: 'center' },
  avatarHat: { fontSize: 36 },
  avatarLevel: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  avatarCoin: { color: '#FFD700', fontSize: 12, marginTop: 4 },
  streakText: { color: '#FF7043', fontSize: 12, marginTop: 2, fontWeight: 'bold' },
  shopBtn: { backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  shopBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  addHabitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E676', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addHabitBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12, marginLeft: 2 },
  habitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 10 },
  habitItemDone: { backgroundColor: '#122E21', opacity: 0.8 },
  habitText: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  habitTextDone: { textDecorationLine: 'line-through', color: '#888' },
  rewardText: { color: '#FFD700', fontSize: 11, marginTop: 2 },
  subFileText: { color: '#00E676', fontSize: 11, marginTop: 2 },
  actionBadge: { backgroundColor: '#00E676', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  actionBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 11 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  finishBtn: { backgroundColor: '#00E676', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  finishBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 15, textAlign: 'center' },
  summaryEmoji: { fontSize: 48, marginBottom: 10 },
  summaryDetailText: { color: '#CCC', fontSize: 14, marginVertical: 4, textAlign: 'center' },
  inputLabel: { color: '#AAA', fontSize: 12, marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 14 },
  modalSubmitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: 'bold' },
  shopItemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', padding: 12, borderRadius: 12, marginBottom: 10 },
  shopItemName: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  shopItemPrice: { color: '#FFD700', fontSize: 12 },
  buyBtn: { backgroundColor: '#00E676', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  buyBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  closeBtn: { backgroundColor: '#333', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' },
  timerText: { fontSize: 48, fontWeight: 'bold', color: '#00E676', marginVertical: 20 },
  pomoControlBtn: { backgroundColor: '#00E676', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
});
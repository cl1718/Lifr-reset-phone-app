import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, Modal, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';


const STORAGE_KEY = '@life_reset_v9_data';

// 設定 Expo 推播行為 (在前台時如何顯示)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 運動圖鑑資料庫
const EXERCISE_DATABASE = [
  {
    id: 'ex1',
    name: '標準掌上壓 (Push-Up)',
    location: 'indoor',
    equipment: 'none',
    target: '胸肌、三頭肌、核心',
    defaultSets: 3,
    defaultReps: '12 次',
    tips: ['手掌位於肩膀正下方', '頭、背、臀、腿呈一直線', '下壓時手肘與身體呈約 45 度角'],
    mistakes: '腰部下沉或臀部抬得太高',
    icon: 'fitness-outline'
  },
  {
    id: 'ex2',
    name: '啞鈴深蹲 (Dumbbell Squat)',
    location: 'both',
    equipment: 'dumbbell',
    target: '股四頭肌、臀大肌',
    defaultSets: 4,
    defaultReps: '10 次',
    tips: ['雙腳與肩同寬，腳尖微外展', '雙手持啞鈴於身體兩側', '下蹲時膝蓋方向與腳尖一致，背部挺直'],
    mistakes: '圓背（彎腰）或膝蓋內扣',
    icon: 'barbell-outline'
  },
  {
    id: 'ex3',
    name: '彈力帶划船 (Band Row)',
    location: 'both',
    equipment: 'band',
    target: '背闊肌、後三角肌',
    defaultSets: 3,
    defaultReps: '15 次',
    tips: ['將彈力帶固定於腳底或固定物', '挺胸收腹，手肘貼近身體往後拉', '頂峰收縮時感受背部擠壓'],
    mistakes: '利用身體晃動借力',
    icon: 'git-compare-outline'
  },
  {
    id: 'ex4',
    name: '公園平行桿 Dips',
    location: 'outdoor',
    equipment: 'park',
    target: '下胸肌、三頭肌',
    defaultSets: 3,
    defaultReps: '8 次',
    tips: ['雙手握緊雙槓，身體微向前傾', '慢速下降至手肘呈 90 度', '發力推起至手臂伸直'],
    mistakes: '下降過深導致肩膀承受過大壓力',
    icon: 'walk-outline'
  },
  {
    id: 'ex5',
    name: '波比跳 (Burpee)',
    location: 'both',
    equipment: 'none',
    target: '全身肌肉、心肺耐力',
    defaultSets: 3,
    defaultReps: '30 秒',
    tips: ['俯臥撑連貫站立跳躍', '落地時保持膝蓋微曲緩衝'],
    mistakes: '落地時動作過於僵硬',
    icon: 'flame-outline'
  }
];

const ACHIEVEMENTS_DEF = [
  { id: 'ach_first_step', title: '萬事起頭難', desc: '完成第 1 組訓練', icon: 'rocket-outline', type: 'sets', req: 1, rewardXp: 50 },
  { id: 'ach_sets_10', title: '健身新兵', desc: '累計完成 10 組訓練', icon: 'trophy-outline', type: 'sets', req: 10, rewardXp: 100 },
  { id: 'ach_sets_50', title: '訓練狂人', desc: '累計完成 50 組訓練', icon: 'flame-outline', type: 'sets', req: 50, rewardXp: 300 },
  { id: 'ach_streak_3', title: '三日熱血', desc: '連續打卡達到 3 天', icon: 'calendar-outline', type: 'streak', req: 3, rewardXp: 80 },
  { id: 'ach_streak_7', title: '習慣成自然', desc: '連續打卡達到 7 天', icon: 'medal-outline', type: 'streak', req: 7, rewardXp: 200 },
  { id: 'ach_rich_200', title: '小有積蓄', desc: '擁有金幣達到 200 點', icon: 'cash-outline', type: 'coins', req: 200, rewardXp: 100 },
];

const DAYS_OF_WEEK = ['一', '二', '三', '四', '五', '六', '日'];

export default function AchievementsScreen() {
  const [currentTab, setCurrentTab] = useState<'main' | 'library' | 'achievements'>('main');

  // 玩家數據
  const [day, setDay] = useState(1);
  const [streak, setStreak] = useState(1);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(100);
  const [totalSets, setTotalSets] = useState(0);

  // 推播提醒設定
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);

  // 每週運動總量數據
  const [weeklySets, setWeeklySets] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // 已解鎖成就
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);

  // 運動庫過濾器狀態
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');

  // Modal 狀態
  const [selectedEx, setSelectedEx] = useState<typeof EXERCISE_DATABASE[0] | null>(null);
  const [completedSets, setCompletedSets] = useState<number>(0);
  const [restTimer, setRestTimer] = useState<number>(60);
  const [isResting, setIsResting] = useState<boolean>(false);

  useEffect(() => { 
    loadData();
    requestNotificationPermissions();
  }, []);

  // 請求推播權限
  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  };

  // 開啟 / 關閉每日提醒 (預設每日晚上 20:00 發送)
  const toggleReminder = async (value: boolean) => {
    setIsReminderEnabled(value);
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('權限未開啟', '請在手機系統設定中允許通知，才能接收打卡提醒！');
          setIsReminderEnabled(false);
          return;
        }
      }

      // 排程每日晚上 8:00 (20:00) 定時推播
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔥 今天打卡了嗎？",
          body: "堅持就是力量！快來完成今天的運動與習慣打卡吧！",
          sound: true,
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        } as any,
      });

      Alert.alert('🔔 提醒已開啟', '系統將在每天晚上 8:00 定時提醒你打卡！');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('🔕 提醒已關閉', '已取消每日打卡推播。');
    }
    saveData(weeklySets, xp, coins, totalSets, unlockedAchievements, value);
  };

  // 發送即時測試推播 (5秒後)
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⚡ 測試提醒成功！",
        body: "這是一條打卡測試通知，功能運作正常！",
      },
      trigger: { seconds: 5 },
    });
    Alert.alert('測試中', '已排程測試通知，請在 5 秒後查看提示！');
  };

  // 休息計時器
  useEffect(() => {
    let interval: any = null;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => setRestTimer(prev => prev - 1), 1000);
    } else if (restTimer === 0 && isResting) {
      setIsResting(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('⏰ 休息時間結束！', '準備開始下一組訓練！');
      setRestTimer(60);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const getTodayIndex = () => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  };

  const saveData = async (
    updatedWeekly = weeklySets, 
    currentXp = xp, 
    currentCoins = coins, 
    currentTotalSets = totalSets,
    currentUnlocked = unlockedAchievements,
    reminderState = isReminderEnabled
  ) => {
    try {
      const data = { 
        day, 
        streak, 
        xp: currentXp, 
        coins: currentCoins, 
        weeklySets: updatedWeekly,
        totalSets: currentTotalSets,
        unlockedAchievements: currentUnlocked,
        isReminderEnabled: reminderState
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      if (value) {
        const data = JSON.parse(value);
        setDay(data.day || 1);
        setStreak(data.streak || 1);
        setXp(data.xp || 0);
        setCoins(data.coins ?? 100);
        setTotalSets(data.totalSets || 0);
        setIsReminderEnabled(data.isReminderEnabled || false);
        if (data.weeklySets) setWeeklySets(data.weeklySets);
        if (data.unlockedAchievements) setUnlockedAchievements(data.unlockedAchievements);
      }
    } catch (e) { console.error(e); }
  };

  // 檢測成就解鎖
  const checkAchievements = (newTotalSets: number, newCoins: number, newStreak: number, currentUnlocked: string[]) => {
    let updatedUnlocked = [...currentUnlocked];
    let newlyUnlockedNames: string[] = [];
    let bonusXp = 0;

    ACHIEVEMENTS_DEF.forEach(ach => {
      if (!updatedUnlocked.includes(ach.id)) {
        let isMet = false;
        if (ach.type === 'sets' && newTotalSets >= ach.req) isMet = true;
        if (ach.type === 'streak' && newStreak >= ach.req) isMet = true;
        if (ach.type === 'coins' && newCoins >= ach.req) isMet = true;

        if (isMet) {
          updatedUnlocked.push(ach.id);
          newlyUnlockedNames.push(ach.title);
          bonusXp += ach.rewardXp;
        }
      }
    });

    if (newlyUnlockedNames.length > 0) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🎉 解鎖新成就勳章！',
        `恭喜獲得成就：${newlyUnlockedNames.join('、')}\n額外獲得：+${bonusXp} XP 獎勵！`
      );
    }

    return { updatedUnlocked, bonusXp };
  };

  // 打卡完成一組
  const handleCompleteSet = () => {
    if (!selectedEx) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextSets = completedSets + 1;
    const nextTotalSets = totalSets + 1;
    setCompletedSets(nextSets);
    setTotalSets(nextTotalSets);

    const todayIndex = getTodayIndex();
    const updatedWeeklySets = [...weeklySets];
    updatedWeeklySets[todayIndex] += 1;
    setWeeklySets(updatedWeeklySets);

    let nextXp = xp;
    let nextCoins = coins;

    if (nextSets >= selectedEx.defaultSets) {
      nextXp += 25;
      nextCoins += 20;
      setXp(nextXp);
      setCoins(nextCoins);
      setIsResting(false);

      Alert.alert(
        '🎉 訓練完成！',
        `恭喜完成 ${selectedEx.name} 全部 ${selectedEx.defaultSets} 組訓練！\n獲得：+25 XP | +💰20 金幣`,
        [{ text: '太棒了', onPress: () => closeModal() }]
      );
    } else {
      setRestTimer(60);
      setIsResting(true);
    }

    const { updatedUnlocked, bonusXp } = checkAchievements(nextTotalSets, nextCoins, streak, unlockedAchievements);
    nextXp += bonusXp;

    setXp(nextXp);
    setUnlockedAchievements(updatedUnlocked);
    saveData(updatedWeeklySets, nextXp, nextCoins, nextTotalSets, updatedUnlocked, isReminderEnabled);
  };

  const openExerciseModal = (ex: typeof EXERCISE_DATABASE[0]) => {
    setSelectedEx(ex);
    setCompletedSets(0);
    setRestTimer(60);
    setIsResting(false);
  };

  const closeModal = () => {
    setSelectedEx(null);
    setCompletedSets(0);
    setIsResting(false);
  };

  const filteredExercises = EXERCISE_DATABASE.filter(ex => {
    const matchLoc = filterLocation === 'all' || ex.location === 'both' || ex.location === filterLocation;
    const matchEq = filterEquipment === 'all' || ex.equipment === filterEquipment;
    return matchLoc && matchEq;
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalWeeklySets = weeklySets.reduce((a, b) => a + b, 0);
  const maxWeeklySet = Math.max(...weeklySets, 10);

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {currentTab === 'main' ? (
          /* ----- 分頁 1：主頁儀表板 & 定時推播設定 ----- */
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.headerTitle}>Life Reset 66</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔥 Day {day} / 66</Text>
              <Text style={styles.cardSub}>經驗值：⚡ {xp} XP  |  金幣：💰 {coins}</Text>
              <Text style={{ color: '#00E676', fontSize: 12, marginTop: 4 }}>總打卡運動組數：{totalSets} 組</Text>
            </View>

            {/* 🔔 每日打卡推播設定卡片 */}
            <View style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="notifications-outline" size={22} color="#FFD700" style={{ marginRight: 8 }} />
                  <Text style={styles.reminderTitle}>每日定時打卡提醒</Text>
                </View>
                <Switch 
                  value={isReminderEnabled} 
                  onValueChange={toggleReminder} 
                  trackColor={{ false: '#444', true: '#00E676' }}
                  thumbColor="#FFF"
                />
              </View>
              <Text style={styles.reminderDesc}>每天晚上 20:00 自動推播提醒，協助保持打卡習慣。</Text>
              
              {isReminderEnabled && (
                <TouchableOpacity style={styles.testBtn} onPress={sendTestNotification}>
                  <Text style={styles.testBtnText}>發送 5 秒測試推播</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 每週圖表 */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>📊 每週運動總量</Text>
                <Text style={styles.chartTotalText}>本週總計：<Text style={styles.highlightText}>{totalWeeklySets}</Text> 組</Text>
              </View>

              <View style={styles.barContainer}>
                {weeklySets.map((count, idx) => {
                  const isToday = idx === getTodayIndex();
                  const barHeightPercent = Math.min((count / maxWeeklySet) * 100, 100);

                  return (
                    <View key={idx} style={styles.barColumn}>
                      <Text style={styles.barValueText}>{count > 0 ? count : ''}</Text>
                      <View style={styles.barTrack}>
                        <View 
                          style={[
                            styles.barFill, 
                            { height: `${Math.max(barHeightPercent, count > 0 ? 10 : 2)}%` },
                            isToday && styles.barFillToday
                          ]} 
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                        {DAYS_OF_WEEK[idx]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionTitle}>快速開始</Text>
            <TouchableOpacity style={styles.goLibraryBtn} onPress={() => setCurrentTab('library')}>
              <Text style={styles.goLibraryBtnText}>🏋️ 打開運動姿勢庫選擇運動打卡</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : currentTab === 'library' ? (
          /* ----- 分頁 2：運動姿勢庫 ----- */
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.headerTitle}>運動姿勢庫</Text>

            <Text style={styles.filterLabel}>📍 運動場所：</Text>
            <View style={styles.filterRow}>
              {[
                { label: '全部', val: 'all' },
                { label: '🏠 戶內', val: 'indoor' },
                { label: '🌳 戶外', val: 'outdoor' }
              ].map(item => (
                <TouchableOpacity 
                  key={item.val} 
                  style={[styles.chip, filterLocation === item.val && styles.chipActive]}
                  onPress={() => setFilterLocation(item.val)}
                >
                  <Text style={[styles.chipText, filterLocation === item.val && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>🏋️ 器材需求：</Text>
            <View style={styles.filterRow}>
              {[
                { label: '全部', val: 'all' },
                { label: '徒手', val: 'none' },
                { label: '啞鈴', val: 'dumbbell' },
                { label: '彈力帶', val: 'band' }
              ].map(item => (
                <TouchableOpacity 
                  key={item.val} 
                  style={[styles.chip, filterEquipment === item.val && styles.chipActive]}
                  onPress={() => setFilterEquipment(item.val)}
                >
                  <Text style={[styles.chipText, filterEquipment === item.val && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>點擊運動進行訓練打卡 ({filteredExercises.length})</Text>
            {filteredExercises.map(ex => (
              <TouchableOpacity key={ex.id} style={styles.exCard} onPress={() => openExerciseModal(ex)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={ex.icon as any} size={28} color="#00E676" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exTarget}>目標：{ex.target} ({ex.defaultSets} 組 × {ex.defaultReps})</Text>
                  </View>
                  <View style={styles.startBadge}>
                    <Text style={styles.startBadgeText}>開始訓練</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          /* ----- 分頁 3：成就館 ----- */
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.headerTitle}>成就勳章館</Text>
            <Text style={styles.subTitle}>解鎖進度：{unlockedAchievements.length} / {ACHIEVEMENTS_DEF.length}</Text>

            <View style={{ marginTop: 10 }}>
              {ACHIEVEMENTS_DEF.map(ach => {
                const isUnlocked = unlockedAchievements.includes(ach.id);
                let currentVal = 0;
                if (ach.type === 'sets') currentVal = totalSets;
                if (ach.type === 'streak') currentVal = streak;
                if (ach.type === 'coins') currentVal = coins;

                return (
                  <View key={ach.id} style={[styles.achCard, !isUnlocked && styles.achCardLocked]}>
                    <View style={styles.achIconBox}>
                      <Ionicons 
                        name={ach.icon as any} 
                        size={30} 
                        color={isUnlocked ? "#FFD700" : "#555"} 
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.achTitle, !isUnlocked && styles.achTextLocked]}>{ach.title}</Text>
                        <Text style={styles.achRewardText}>+{ach.rewardXp} XP</Text>
                      </View>
                      <Text style={styles.achDesc}>{ach.desc}</Text>

                      {!isUnlocked && (
                        <View style={styles.progressRow}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${Math.min((currentVal / ach.req) * 100, 100)}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{currentVal}/{ach.req}</Text>
                        </View>
                      )}
                    </View>
                    {isUnlocked && (
                      <View style={styles.unlockedBadge}>
                        <Text style={styles.unlockedBadgeText}>已解鎖</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* 底部導覽列 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('main')}>
          <Ionicons name="home-outline" size={22} color={currentTab === 'main' ? "#00E676" : "#888"} />
          <Text style={[styles.navText, currentTab === 'main' && styles.navTextActive]}>主頁</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('library')}>
          <Ionicons name="barbell-outline" size={22} color={currentTab === 'library' ? "#00E676" : "#888"} />
          <Text style={[styles.navText, currentTab === 'library' && styles.navTextActive]}>運動庫</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('achievements')}>
          <Ionicons name="trophy-outline" size={22} color={currentTab === 'achievements' ? "#00E676" : "#888"} />
          <Text style={[styles.navText, currentTab === 'achievements' && styles.navTextActive]}>成就館</Text>
        </TouchableOpacity>
      </View>

      {/* 運動 Modal */}
      <Modal visible={selectedEx !== null} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEx && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedEx.name}</Text>
                <Text style={styles.modalTarget}>🎯 目標部位：{selectedEx.target}</Text>

                <View style={styles.trackerBox}>
                  <Text style={styles.trackerTitle}>實時訓練進度</Text>
                  <Text style={styles.setCounterText}>
                    已完成組數：<Text style={{ color: '#00E676', fontSize: 24 }}>{completedSets}</Text> / {selectedEx.defaultSets} 組
                  </Text>
                  <Text style={{ color: '#AAA', fontSize: 12, marginTop: 2 }}>每組目標：{selectedEx.defaultReps}</Text>

                  {isResting && (
                    <View style={styles.timerBox}>
                      <Text style={styles.timerLabel}>⏳ 組間休息計時</Text>
                      <Text style={styles.timerValue}>{formatTime(restTimer)}</Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={[
                      styles.completeSetBtn, 
                      completedSets >= selectedEx.defaultSets && { backgroundColor: '#444' }
                    ]} 
                    onPress={handleCompleteSet}
                    disabled={completedSets >= selectedEx.defaultSets}
                  >
                    <Text style={styles.completeSetBtnText}>
                      {completedSets >= selectedEx.defaultSets ? '✅ 全部組數已完成' : `打卡第 ${completedSets + 1} 組 (+休息倒數)`}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.detailHeading}>✅ 正確姿勢要領：</Text>
                {selectedEx.tips.map((tip, idx) => (
                  <Text key={idx} style={styles.tipText}>• {tip}</Text>
                ))}

                <Text style={[styles.detailHeading, { color: '#FF5252', marginTop: 15 }]}>❌ 常犯錯誤：</Text>
                <Text style={styles.tipText}>{selectedEx.mistakes}</Text>

                <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                  <Text style={styles.closeBtnText}>結束 / 關閉 Modal</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 20, paddingBottom: 80 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 10 },
  subTitle: { color: '#AAA', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  card: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 16, marginVertical: 10, alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  cardSub: { color: '#AAA', fontSize: 13, marginTop: 5 },

  /* 推播提醒卡片樣式 */
  reminderCard: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 16, marginVertical: 8 },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  reminderDesc: { color: '#888', fontSize: 12, marginTop: 6 },
  testBtn: { backgroundColor: '#333', paddingVertical: 8, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  testBtnText: { color: '#00E676', fontSize: 12, fontWeight: 'bold' },

  chartCard: { backgroundColor: '#1E1E1E', padding: 18, borderRadius: 16, marginVertical: 10 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  chartTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  chartTotalText: { color: '#AAA', fontSize: 13 },
  highlightText: { color: '#00E676', fontWeight: 'bold', fontSize: 16 },
  barContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: 15 },
  barColumn: { alignItems: 'center', flex: 1 },
  barValueText: { color: '#00E676', fontSize: 10, fontWeight: 'bold', marginBottom: 4, height: 14 },
  barTrack: { width: 14, height: 80, backgroundColor: '#2A2A2A', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#555', borderRadius: 7 },
  barFillToday: { backgroundColor: '#00E676' },
  barLabel: { color: '#888', fontSize: 12, marginTop: 6 },
  barLabelToday: { color: '#00E676', fontWeight: 'bold' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginTop: 15, marginBottom: 10 },
  goLibraryBtn: { backgroundColor: '#00E676', padding: 16, borderRadius: 12, alignItems: 'center' },
  goLibraryBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  filterLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginTop: 10, marginBottom: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: { backgroundColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#00E676' },
  chipText: { color: '#AAA', fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: 'bold' },
  exCard: { backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 10 },
  exName: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  exTarget: { color: '#888', fontSize: 12, marginTop: 2 },
  startBadge: { backgroundColor: '#00E676', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  startBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 11 },

  achCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 14, marginBottom: 12, alignItems: 'center' },
  achCardLocked: { opacity: 0.6 },
  achIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  achTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  achTextLocked: { color: '#AAA' },
  achDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  achRewardText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden', marginRight: 8 },
  progressFill: { height: '100%', backgroundColor: '#00E676' },
  progressText: { color: '#888', fontSize: 10 },
  unlockedBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  unlockedBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 10 },

  bottomNav: { flexDirection: 'row', height: 60, backgroundColor: '#1E1E1E', borderTopWidth: 1, borderTopColor: '#333', position: 'absolute', bottom: 0, left: 0, right: 0 },
  navItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { color: '#888', fontSize: 10, marginTop: 2 },
  navTextActive: { color: '#00E676', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  modalTarget: { color: '#888', fontSize: 13, marginBottom: 15 },
  trackerBox: { backgroundColor: '#2A2A2A', padding: 16, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
  trackerTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  setCounterText: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  timerBox: { marginTop: 12, backgroundColor: '#121212', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  timerLabel: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  timerValue: { color: '#FFD700', fontSize: 28, fontWeight: 'bold', marginTop: 2 },
  completeSetBtn: { backgroundColor: '#00E676', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginTop: 12, width: '100%', alignItems: 'center' },
  completeSetBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  detailHeading: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginBottom: 6 },
  tipText: { color: '#DDD', fontSize: 13, lineHeight: 20, marginBottom: 4 },
  closeBtn: { backgroundColor: '#333', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' }
});
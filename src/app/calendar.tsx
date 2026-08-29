// src/Calendar.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const EVENTS_STORAGE_KEY = '@life_reset_events_data';

export interface EventItem {
  id: string;
  title: string;
  time?: string;
}

const getLocalTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalTodayString());
  const [eventsMap, setEventsMap] = useState<{ [date: string]: EventItem[] }>({});
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [eventTitle, setEventTitle] = useState<string>('');
  
  // 1. 時間相關 State：選中的 Date 物件與 Picker 顯隱狀態
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  const isInitialMount = useRef<boolean>(true);

  // 讀取與儲存資料
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
        if (data) setEventsMap(JSON.parse(data));
      } catch (e) {
        console.error('Failed to load events:', e);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const saveEvents = async () => {
      try {
        await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(eventsMap));
      } catch (e) {
        console.error('Failed to save events:', e);
      }
    };
    saveEvents();
  }, [eventsMap]);

  // 時間格式化工具：將 Date 轉換為 HH:mm 格式字串
  const formatTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 2. 處理時間選擇事件
  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    // Android 下點擊取消
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    // iOS/Android 選擇時間後更新狀態
    if (date) {
      setSelectedTime(date);
    }
    // Android 選完後需自動關閉，iOS 保留顯示
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
  };

  const resetForm = () => {
    setEventTitle('');
    setSelectedTime(null);
    setShowTimePicker(false);
    setShowAddModal(false);
  };

  const handleAddEvent = () => {
    if (!eventTitle.trim()) {
      Alert.alert('提示', '請輸入活動名稱');
      return;
    }

    const newEvent: EventItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: eventTitle.trim(),
      time: selectedTime ? formatTime(selectedTime) : undefined,
    };

    setEventsMap(prev => {
      const currentList = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: [...currentList, newEvent] };
    });

    resetForm();
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert('刪除行程', '確定要刪除此項活動嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          setEventsMap(prev => {
            const currentList = prev[selectedDate] || [];
            const updatedList = currentList.filter(e => e.id !== eventId);
            const copy = { ...prev };
            if (updatedList.length === 0) {
              delete copy[selectedDate];
            } else {
              copy[selectedDate] = updatedList;
            }
            return copy;
          });
        },
      },
    ]);
  };

  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    Object.keys(eventsMap).forEach(date => {
      if (eventsMap[date]?.length > 0) {
        marked[date] = { marked: true, dotColor: '#00E676' };
      }
    });

    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#00E676',
      selectedTextColor: '#000000',
    };

    return marked;
  }, [eventsMap, selectedDate]);

  const currentDayEvents = eventsMap[selectedDate] || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headerTitle}>📅 活動日曆</Text>

        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#1E1E1E',
              calendarBackground: '#1E1E1E',
              textSectionTitleColor: '#AAA',
              selectedDayBackgroundColor: '#00E676',
              selectedDayTextColor: '#000000',
              todayTextColor: '#00E676',
              dayTextColor: '#FFFFFF',
              textDisabledColor: '#444444',
              dotColor: '#00E676',
              selectedDotColor: '#000000',
              arrowColor: '#00E676',
              monthTextColor: '#FFFFFF',
              indicatorColor: '#00E676',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
            }}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedDate} 活動行程</Text>
          <TouchableOpacity
            style={styles.addHabitBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.addHabitBtnText}>新增活動</Text>
          </TouchableOpacity>
        </View>

        {currentDayEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>今天目前沒有安排任何活動 ☕</Text>
          </View>
        ) : (
          currentDayEvents.map(event => (
            <View key={event.id} style={styles.eventItem}>
              <View style={styles.eventTextContainer}>
                <Text style={styles.eventTitleText}>{event.title}</Text>
                {event.time ? (
                  <Text style={styles.eventTimeText}>⏰ {event.time}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteEvent(event.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 新增活動 Modal */}
      <Modal visible={showAddModal} animationType="fade" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📌 新增行程 ({selectedDate})</Text>

            <Text style={styles.inputLabel}>活動名稱</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：健身房運動 / 團隊會議"
              placeholderTextColor="#666"
              value={eventTitle}
              onChangeText={setEventTitle}
              autoFocus
            />

            <Text style={styles.inputLabel}>時間 (選填)</Text>

            {/* 3. 時間選擇按鈕按鈕 */}
            <TouchableOpacity
              style={styles.timePickerSelector}
              onPress={() => setShowTimePicker(prev => !prev)}
            >
              <Ionicons name="time-outline" size={18} color="#00E676" />
              <Text style={styles.timePickerText}>
                {selectedTime ? formatTime(selectedTime) : '點擊選擇時間'}
              </Text>
              {selectedTime && (
                <TouchableOpacity
                  onPress={() => setSelectedTime(null)}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close-circle" size={16} color="#888" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* 4. DateTimePicker 渲染 */}
            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={selectedTime || new Date()}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="dark" // 配合黑夜模式
                  onChange={handleTimeChange}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={resetForm}
              >
                <Text style={styles.modalBtnText}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddEvent}
              >
                <Text style={[styles.modalBtnText, { color: '#000' }]}>儲存活動</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  addHabitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E676', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addHabitBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13, marginLeft: 4 },
  calendarContainer: { borderRadius: 16, overflow: 'hidden', marginTop: 15 },
  eventItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 10 },
  eventTextContainer: { flex: 1 },
  eventTitleText: { color: '#FFF', fontSize: 15, fontWeight: '500' },
  eventTimeText: { color: '#00E676', fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 6, marginLeft: 8 },
  emptyCard: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 5 },
  emptyText: { color: '#666', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 15, textAlign: 'center' },
  inputLabel: { color: '#AAA', fontSize: 12, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 14 },
  
  // 時間選擇按鈕樣式
  timePickerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  timePickerText: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
  },
  pickerContainer: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
  },

  modalActions: { flexDirection: 'row', marginTop: 24, gap: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#333' },
  saveBtn: { backgroundColor: '#00E676' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' },
});
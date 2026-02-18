import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';

type TimePickerSheetProps = {
  visible: boolean;
  value: string; // 'HH:mm'
  onConfirm: (time: string) => void;
  onClose: () => void;
};

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const CENTER_OFFSET = Math.floor(VISIBLE_ITEMS / 2);

function generateHours(): string[] {
  return Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
}

function generateMinutes(): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, '0'),
  );
}

export function TimePickerSheet({
  visible,
  value,
  onConfirm,
  onClose,
}: TimePickerSheetProps): React.JSX.Element {
  const [hour, minute] = value.split(':');
  const [selectedHour, setSelectedHour] = useState(hour ?? '09');
  const [selectedMinute, setSelectedMinute] = useState(minute ?? '00');

  const hours = useMemo(() => generateHours(), []);
  const minutes = useMemo(() => generateMinutes(), []);

  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  const handleOpen = useCallback((): void => {
    const [h, m] = value.split(':');
    setSelectedHour(h ?? '09');
    setSelectedMinute(m ?? '00');

    // Scroll to initial positions after render
    requestAnimationFrame(() => {
      const hourIndex = hours.indexOf(h ?? '09');
      const minuteIndex = minutes.indexOf(m ?? '00');
      if (hourIndex >= 0) {
        hourRef.current?.scrollToOffset({
          offset: hourIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
      if (minuteIndex >= 0) {
        minuteRef.current?.scrollToOffset({
          offset: minuteIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
    });
  }, [value, hours, minutes]);

  const handleConfirm = (): void => {
    onConfirm(`${selectedHour}:${selectedMinute}`);
    onClose();
  };

  const handleHourScroll = useCallback(
    (offsetY: number): void => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, hours.length - 1));
      setSelectedHour(hours[clamped] ?? '09');
    },
    [hours],
  );

  const handleMinuteScroll = useCallback(
    (offsetY: number): void => {
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, minutes.length - 1));
      setSelectedMinute(minutes[clamped] ?? '00');
    },
    [minutes],
  );

  const renderItem = (
    item: string,
    isSelected: boolean,
  ): React.JSX.Element => (
    <View style={styles.pickerItem}>
      <Text
        style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}
      >
        {item}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* prevent close */ }}>
          <View style={styles.header}>
            <Text style={styles.title}>시간 선택</Text>
            <Text style={styles.preview}>
              {selectedHour}:{selectedMinute}
            </Text>
          </View>

          <View style={styles.pickerContainer}>
            {/* Hour column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>시</Text>
              <View style={styles.listWrapper}>
                <View style={styles.selectionIndicator} />
                <FlatList
                  ref={hourRef}
                  data={hours}
                  keyExtractor={(item) => `h-${item}`}
                  renderItem={({ item }) =>
                    renderItem(item, item === selectedHour)
                  }
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingVertical: CENTER_OFFSET * ITEM_HEIGHT,
                  }}
                  onMomentumScrollEnd={(e) =>
                    handleHourScroll(e.nativeEvent.contentOffset.y)
                  }
                  style={styles.list}
                />
              </View>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* Minute column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>분</Text>
              <View style={styles.listWrapper}>
                <View style={styles.selectionIndicator} />
                <FlatList
                  ref={minuteRef}
                  data={minutes}
                  keyExtractor={(item) => `m-${item}`}
                  renderItem={({ item }) =>
                    renderItem(item, item === selectedMinute)
                  }
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: ITEM_HEIGHT * index,
                    index,
                  })}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingVertical: CENTER_OFFSET * ITEM_HEIGHT,
                  }}
                  onMomentumScrollEnd={(e) =>
                    handleMinuteScroll(e.nativeEvent.contentOffset.y)
                  }
                  style={styles.list}
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="취소"
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="시간 확인"
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  preview: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  column: {
    alignItems: 'center',
    width: 80,
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 8,
  },
  listWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
    position: 'relative',
  },
  list: {
    width: 80,
  },
  selectionIndicator: {
    position: 'absolute',
    top: CENTER_OFFSET * ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    zIndex: -1,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemText: {
    fontSize: 20,
    color: colors.gray400,
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 22,
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray900,
    marginHorizontal: 12,
    marginTop: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.gray700,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

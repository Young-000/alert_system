import React, { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

type WheelPickerProps = {
  items: number[];
  selectedValue: number;
  onValueChange: (value: number) => void;
};

function WheelPicker({
  items,
  selectedValue,
  onValueChange,
}: WheelPickerProps): React.JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);

  // Scroll to initial selected value
  useEffect(() => {
    const index = items.indexOf(selectedValue);
    if (index >= 0 && scrollRef.current && !isUserScrolling.current) {
      scrollRef.current.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedValue, items]);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const value = items[clampedIndex];
      if (value !== undefined && value !== selectedValue) {
        onValueChange(value);
      }
      isUserScrolling.current = false;
    },
    [items, selectedValue, onValueChange],
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  return (
    <View style={styles.wheelContainer}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
      >
        {items.map((item) => {
          const isSelected = item === selectedValue;
          return (
            <View key={item} style={styles.itemContainer}>
              <Text
                style={[
                  styles.itemText,
                  isSelected && styles.itemTextSelected,
                ]}
              >
                {String(item).padStart(2, '0')}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Selection highlight overlay */}
      <View style={styles.selectionOverlay} pointerEvents="none" />
    </View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type TimePickerProps = {
  hour: number;
  minute: number;
  onChangeHour: (hour: number) => void;
  onChangeMinute: (minute: number) => void;
};

export function TimePicker({
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
}: TimePickerProps): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityLabel="시간 선택">
      <WheelPicker
        items={HOURS}
        selectedValue={hour}
        onValueChange={onChangeHour}
      />
      <Text style={styles.separator}>:</Text>
      <WheelPicker
        items={MINUTES}
        selectedValue={minute}
        onValueChange={onChangeMinute}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    width: 70,
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: ITEM_HEIGHT, // Offset so first/last items can be centered
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.gray400,
  },
  itemTextSelected: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray900,
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.gray900,
    marginHorizontal: 8,
  },
});

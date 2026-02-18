import React, { useCallback, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/constants/colors';

import type { ReactNode } from 'react';

const SWIPE_THRESHOLD = 80;
const DELETE_BUTTON_WIDTH = 80;

type SwipeableRowProps = {
  children: ReactNode;
  onDelete: () => void;
};

export function SwipeableRow({
  children,
  onDelete,
}: SwipeableRowProps): React.JSX.Element {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 5,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const openDeleteButton = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -DELETE_BUTTON_WIDTH,
      useNativeDriver: true,
      bounciness: 5,
    }).start();
    isOpen.current = true;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only respond to horizontal swipes
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (isOpen.current) {
          // Allow dragging from open position
          const newValue = Math.min(
            0,
            Math.max(-DELETE_BUTTON_WIDTH * 1.5, -DELETE_BUTTON_WIDTH + gestureState.dx),
          );
          translateX.setValue(newValue);
        } else {
          // Only allow left swipe
          const newValue = Math.min(0, gestureState.dx);
          translateX.setValue(newValue);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (isOpen.current) {
          // If swiping right from open position, close it
          if (gestureState.dx > 20) {
            resetPosition();
          } else {
            openDeleteButton();
          }
        } else {
          // Opening: check if threshold exceeded
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            openDeleteButton();
          } else {
            resetPosition();
          }
        }
      },
    }),
  ).current;

  const handleDelete = useCallback(() => {
    resetPosition();
    onDelete();
  }, [onDelete, resetPosition]);

  return (
    <View style={styles.container}>
      {/* Delete button behind */}
      <View style={styles.deleteContainer}>
        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel="삭제"
        >
          <Text style={styles.deleteText}>삭제</Text>
        </Pressable>
      </View>

      {/* Swipeable content */}
      <Animated.View
        style={[styles.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: 10,
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 10, // Match marginBottom of card
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    backgroundColor: colors.white,
  },
});

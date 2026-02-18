import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { ViewStyle } from 'react-native';

type SkeletonBoxProps = {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonBoxProps): React.JSX.Element {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width: width as number,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[styles.shimmer, { transform: [{ translateX }] }]}
      />
    </View>
  );
}

/** Full card skeleton matching the home screen card style. */
export function SkeletonCard(): React.JSX.Element {
  return (
    <View style={styles.card}>
      <SkeletonBox width="60%" height={20} />
      <SkeletonBox width="40%" height={16} style={styles.mt12} />
      <SkeletonBox width="80%" height={16} style={styles.mt12} />
      <SkeletonBox width="50%" height={16} style={styles.mt12} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.skeletonBase,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 200,
    backgroundColor: colors.skeletonHighlight,
    opacity: 0.5,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  mt12: {
    marginTop: 12,
  },
});

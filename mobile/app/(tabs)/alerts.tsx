import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AlertsScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>알림 설정</Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🔔</Text>
          <Text style={styles.placeholderText}>알림 목록이 여기에 표시됩니다.</Text>
          <Text style={styles.placeholderSubtext}>
            출근/퇴근 알림을 설정해보세요
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

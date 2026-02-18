import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

function TabIcon({ label, color }: { label: string; color: string }): React.JSX.Element {
  return <Text style={[styles.icon, { color }]}>{label}</Text>;
}

export default function TabLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
          tabBarAccessibilityLabel: '홈 탭',
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: '알림',
          tabBarIcon: ({ color }) => <TabIcon label="🔔" color={color} />,
          tabBarAccessibilityLabel: '알림 설정 탭',
        }}
      />
      <Tabs.Screen
        name="commute"
        options={{
          title: '출퇴근',
          tabBarIcon: ({ color }) => <TabIcon label="🚇" color={color} />,
          tabBarAccessibilityLabel: '출퇴근 트래킹 탭',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabIcon label="⚙️" color={color} />,
          tabBarAccessibilityLabel: '설정 탭',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});

import React from 'react';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppInfoSection } from '@/components/settings/AppInfoSection';
import { QuickLinksSection } from '@/components/settings/QuickLinksSection';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsScreen(): React.JSX.Element {
  const { user, isLoggedIn, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = (): void => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = (): void => {
    setShowLogoutConfirm(false);
    void logout();
  };

  const cancelLogout = (): void => {
    setShowLogoutConfirm(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>설정</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {isLoggedIn
                ? user?.name?.[0]?.toUpperCase() ?? '?'
                : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {isLoggedIn ? (
              <>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </>
            ) : (
              <Text style={styles.profileName}>게스트</Text>
            )}
          </View>
        </View>

        {/* Quick Links */}
        <QuickLinksSection />

        {/* App Info */}
        <AppInfoSection />

        {/* Logout */}
        {isLoggedIn && (
          <View style={styles.logoutSection}>
            <Pressable
              style={styles.logoutButton}
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="로그아웃"
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelLogout}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>로그아웃</Text>
            <Text style={styles.modalMessage}>정말 로그아웃하시겠습니까?</Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelLogout}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.modalButtonTextCancel}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
                accessibilityRole="button"
                accessibilityLabel="로그아웃 확인"
              >
                <Text style={styles.modalButtonTextConfirm}>로그아웃</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.gray500,
  },
  logoutSection: {
    marginTop: 8,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.gray500,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray100,
  },
  modalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  modalButtonTextCancel: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

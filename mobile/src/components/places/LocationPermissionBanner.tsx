import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type PermissionStatus = 'undetermined' | 'foreground_only' | 'always' | 'denied';

type LocationPermissionBannerProps = {
  status: PermissionStatus;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
};

export function LocationPermissionBanner({
  status,
  onRequestPermission,
  onOpenSettings,
}: LocationPermissionBannerProps): React.JSX.Element | null {
  if (status === 'always') {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <Text style={styles.successIcon}>{'✓'}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.successTitle}>위치 권한: 항상 허용</Text>
          <Text style={styles.successDescription}>
            자동 출퇴근 감지가 활성화되어 있습니다.
          </Text>
        </View>
      </View>
    );
  }

  if (status === 'undetermined') {
    return (
      <View style={[styles.container, styles.infoContainer]}>
        <View style={styles.textContainer}>
          <Text style={styles.infoTitle}>위치 권한이 필요합니다</Text>
          <Text style={styles.infoDescription}>
            출퇴근 자동 감지를 위해 위치 권한을 허용해주세요.
          </Text>
        </View>
        <Pressable
          style={styles.actionButton}
          onPress={onRequestPermission}
          accessibilityRole="button"
          accessibilityLabel="위치 권한 허용하기"
        >
          <Text style={styles.actionButtonText}>권한 허용하기</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'foreground_only') {
    return (
      <View style={[styles.container, styles.warningContainer]}>
        <View style={styles.textContainer}>
          <Text style={styles.warningTitle}>백그라운드 위치 권한 필요</Text>
          <Text style={styles.warningDescription}>
            앱을 닫아도 출퇴근을 감지하려면 "항상 허용"이 필요합니다.
          </Text>
        </View>
        <Pressable
          style={styles.settingsButton}
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="설정으로 이동"
        >
          <Text style={styles.settingsButtonText}>설정으로 이동</Text>
        </Pressable>
      </View>
    );
  }

  // status === 'denied'
  return (
    <View style={[styles.container, styles.errorContainer]}>
      <View style={styles.textContainer}>
        <Text style={styles.errorTitle}>위치 권한 거부됨</Text>
        <Text style={styles.errorDescription}>
          자동 감지를 사용하려면 설정에서 위치 권한을 변경해주세요.
        </Text>
      </View>
      <Pressable
        style={styles.settingsButton}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="설정 열기"
      >
        <Text style={styles.settingsButtonText}>설정 열기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  textContainer: {
    flex: 1,
    marginBottom: 12,
  },
  // Success
  successContainer: {
    backgroundColor: colors.successLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 18,
    color: colors.success,
    fontWeight: '700',
    marginRight: 12,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  successDescription: {
    fontSize: 13,
    color: colors.success,
    marginTop: 2,
  },
  // Info (undetermined)
  infoContainer: {
    backgroundColor: colors.primaryLight,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  infoDescription: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
    lineHeight: 18,
  },
  // Warning (foreground only)
  warningContainer: {
    backgroundColor: colors.warningLight,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.warning,
  },
  warningDescription: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 4,
    lineHeight: 18,
  },
  // Error (denied)
  errorContainer: {
    backgroundColor: colors.dangerLight,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  errorDescription: {
    fontSize: 13,
    color: '#991B1B',
    marginTop: 4,
    lineHeight: 18,
  },
  // Buttons
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  settingsButtonText: {
    color: colors.gray700,
    fontSize: 14,
    fontWeight: '600',
  },
});

import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

import type { Place } from '@/types/place';

type PlaceCardProps = {
  place: Place;
  onToggle: (id: string) => void;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => void;
};

const PLACE_ICONS: Record<string, string> = {
  home: '🏠',
  work: '🏢',
};

const PLACE_LABELS: Record<string, string> = {
  home: '집',
  work: '회사',
};

export function PlaceCard({
  place,
  onToggle,
  onEdit,
  onDelete,
}: PlaceCardProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{PLACE_ICONS[place.placeType] ?? '📍'}</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.label}>{place.label}</Text>
            <Text style={styles.type}>{PLACE_LABELS[place.placeType] ?? place.placeType}</Text>
          </View>
        </View>
        <Switch
          value={place.isActive}
          onValueChange={() => onToggle(place.id)}
          trackColor={{ false: colors.gray300, true: colors.primaryLight }}
          thumbColor={place.isActive ? colors.primary : colors.gray400}
          accessibilityRole="switch"
          accessibilityLabel={`${place.label} 감지 ${place.isActive ? '활성' : '비활성'}`}
          accessibilityState={{ checked: place.isActive }}
        />
      </View>

      {place.address ? (
        <Text style={styles.address} numberOfLines={1}>
          {place.address}
        </Text>
      ) : null}

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>반경 {place.radiusM}m</Text>
        <Text style={styles.infoDot}>{'·'}</Text>
        <Text style={styles.infoText}>
          {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.editButton}
          onPress={() => onEdit(place)}
          accessibilityRole="button"
          accessibilityLabel={`${place.label} 수정`}
        >
          <Text style={styles.editButtonText}>수정</Text>
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(place.id)}
          accessibilityRole="button"
          accessibilityLabel={`${place.label} 삭제`}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  type: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: colors.gray500,
    marginBottom: 6,
    paddingLeft: 36,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: colors.gray400,
  },
  infoDot: {
    fontSize: 12,
    color: colors.gray300,
    marginHorizontal: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.dangerLight,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});

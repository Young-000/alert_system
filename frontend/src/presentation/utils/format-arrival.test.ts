import { describe, it, expect } from 'vitest';
import {
  formatArrivalTime,
  formatArrivalWithSuffix,
  isArrivingSoon,
  ARRIVING_SOON_SECONDS,
} from './format-arrival';

describe('format-arrival', () => {
  describe('formatArrivalTime', () => {
    it('returns 곧 도착 for 60 seconds or less', () => {
      expect(formatArrivalTime(0)).toBe('곧 도착');
      expect(formatArrivalTime(45)).toBe('곧 도착');
      expect(formatArrivalTime(60)).toBe('곧 도착');
    });

    it('renders seconds as minutes', () => {
      expect(formatArrivalTime(180)).toBe('3분');
      expect(formatArrivalTime(300)).toBe('5분');
    });

    it('floors partial minutes', () => {
      expect(formatArrivalTime(210)).toBe('3분');
      expect(formatArrivalTime(119)).toBe('1분');
    });
  });

  describe('formatArrivalWithSuffix', () => {
    it('returns 곧 도착 for 60 seconds or less', () => {
      expect(formatArrivalWithSuffix(0)).toBe('곧 도착');
      expect(formatArrivalWithSuffix(60)).toBe('곧 도착');
    });

    it('appends 후 도착', () => {
      expect(formatArrivalWithSuffix(180)).toBe('3분 후 도착');
    });
  });

  describe('isArrivingSoon', () => {
    it('flags 2 minutes or less', () => {
      expect(isArrivingSoon(30)).toBe(true);
      expect(isArrivingSoon(ARRIVING_SOON_SECONDS)).toBe(true);
    });

    it('does not flag beyond 2 minutes', () => {
      expect(isArrivingSoon(ARRIVING_SOON_SECONDS + 1)).toBe(false);
      expect(isArrivingSoon(180)).toBe(false);
    });

    it('treats 0 and negative as no data', () => {
      expect(isArrivingSoon(0)).toBe(false);
      expect(isArrivingSoon(-1)).toBe(false);
    });
  });
});

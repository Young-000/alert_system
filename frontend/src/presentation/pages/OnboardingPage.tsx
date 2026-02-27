import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@presentation/hooks/useAuth';
import { safeSetItem } from '@infrastructure/storage/safe-storage';
import {
  getCommuteApiClient,
  type CreateRouteDto,
  type RouteType,
} from '@infrastructure/api/commute-api.client';

type OnboardingStep = 'welcome' | 'commute-question' | 'transport' | 'duration' | 'complete';
type TransportMode = 'subway' | 'bus' | 'car' | 'walk' | 'mixed';

interface OnboardingData {
  hasCommute: boolean | null;
  transportMode: TransportMode | null;
  estimatedDuration: number;
  routeType: RouteType;
}

const TRANSPORT_OPTIONS: { value: TransportMode; label: string; description: string }[] = [
  { value: 'subway', label: '지하철', description: '주로 지하철로 이동해요' },
  { value: 'bus', label: '버스', description: '버스를 주로 이용해요' },
  { value: 'mixed', label: '지하철+버스', description: '여러 교통수단을 이용해요' },
  { value: 'car', label: '자가용', description: '자가용으로 출퇴근해요' },
  { value: 'walk', label: '도보/자전거', description: '걷거나 자전거로 이동해요' },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function OnboardingPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId, userName } = useAuth();
  const commuteApi = useMemo(() => getCommuteApiClient(), []);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<OnboardingData>({
    hasCommute: null,
    transportMode: null,
    estimatedDuration: 30,
    routeType: 'morning',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Skip onboarding and go to main
  const handleSkip = () => {
    safeSetItem('onboardingCompleted', 'true');
    navigate('/');
  };

  // Go to next step
  const goNext = () => {
    const steps: OnboardingStep[] = ['welcome', 'commute-question', 'transport', 'duration', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  // Go to previous step
  const goBack = () => {
    const steps: OnboardingStep[] = ['welcome', 'commute-question', 'transport', 'duration', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Handle commute question answer
  const handleCommuteAnswer = (hasCommute: boolean) => {
    setData({ ...data, hasCommute });
    if (hasCommute) {
      goNext();
    } else {
      // No commute - skip to complete
      setStep('complete');
    }
  };

  // Handle transport selection
  const handleTransportSelect = (mode: TransportMode) => {
    setData({ ...data, transportMode: mode });
    goNext();
  };

  // Handle duration change
  const handleDurationChange = (duration: number) => {
    setData({ ...data, estimatedDuration: duration });
  };

  // Create route from onboarding data
  const createRouteFromOnboarding = async () => {
    if (!userId || !data.hasCommute || !data.transportMode) return;

    setIsCreating(true);
    setError('');

    try {
      // Create simple route based on transport mode
      const checkpoints = getCheckpointsForTransport(data.transportMode, data.estimatedDuration);

      const routeDto: CreateRouteDto = {
        userId,
        name: '출근 경로',
        routeType: 'morning',
        isPreferred: true,
        checkpoints,
      };

      await commuteApi.createRoute(routeDto);

      // Also create evening route
      const eveningDto: CreateRouteDto = {
        userId,
        name: '퇴근 경로',
        routeType: 'evening',
        isPreferred: false,
        checkpoints: [...checkpoints].reverse().map((cp, index) => ({
          ...cp,
          sequenceOrder: index + 1,
        })),
      };

      await commuteApi.createRoute(eveningDto);

      safeSetItem('onboardingCompleted', 'true');
      setStep('complete');
    } catch {
      setError('경로 생성에 실패했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setIsCreating(false);
    }
  };

  // Generate checkpoints based on transport mode
  const getCheckpointsForTransport = (mode: TransportMode, totalDuration: number) => {
    if (mode === 'walk' || mode === 'car') {
      return [
        {
          sequenceOrder: 1,
          name: '집',
          checkpointType: 'home' as const,
          expectedDurationToNext: totalDuration,
          expectedWaitTime: 0,
          transportMode: mode === 'car' ? 'taxi' as const : 'walk' as const,
        },
        {
          sequenceOrder: 2,
          name: '회사',
          checkpointType: 'work' as const,
          expectedWaitTime: 0,
        },
      ];
    }

    // For subway, bus, or mixed - add a station/stop
    const midDuration = Math.floor(totalDuration * 0.3);
    const remainDuration = totalDuration - midDuration;

    return [
      {
        sequenceOrder: 1,
        name: '집',
        checkpointType: 'home' as const,
        expectedDurationToNext: midDuration,
        expectedWaitTime: 0,
        transportMode: 'walk' as const,
      },
      {
        sequenceOrder: 2,
        name: mode === 'bus' ? '버스 정류장' : '지하철역',
        checkpointType: mode === 'bus' ? 'bus_stop' as const : 'subway' as const,
        expectedDurationToNext: remainDuration,
        expectedWaitTime: 5,
        transportMode: mode === 'bus' ? 'bus' as const : 'subway' as const,
      },
      {
        sequenceOrder: 3,
        name: '회사',
        checkpointType: 'work' as const,
        expectedWaitTime: 0,
      },
    ];
  };

  return (
    <main className="page onboarding-page">
      <nav className="nav">
        <div className="brand">
          <strong>출퇴근 메이트</strong>
        </div>
        {step !== 'complete' && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleSkip}>
            건너뛰기
          </button>
        )}
      </nav>

      <div className="onboarding-container">
        {/* Step: Welcome */}
        {step === 'welcome' && (
          <section className="onboarding-step welcome-step">
            <div className="welcome-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <h1>환영합니다{userName ? `, ${userName}님` : ''}!</h1>
            <p className="welcome-desc">
              출퇴근 메이트가 여러분의 출퇴근을 도와드릴게요.<br />
              간단한 설정으로 시작해볼까요?
            </p>
            <div className="welcome-features">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>출퇴근 시간 기록</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span>통계 및 분석</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                <span>최적 경로 추천</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={goNext}>
              시작하기
            </button>
          </section>
        )}

        {/* Step: Commute Question */}
        {step === 'commute-question' && (
          <section className="onboarding-step question-step">
            <div className="step-indicator">
              <span className="step-num">1</span>
              <span className="step-total">/ 3</span>
            </div>
            <h2>출퇴근을 하시나요?</h2>
            <p className="step-desc">직장, 학교 등 정기적으로 이동하는 곳이 있나요?</p>

            <div className="question-options">
              <button
                type="button"
                className="option-card"
                onClick={() => handleCommuteAnswer(true)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="option-label">네, 있어요</span>
                <span className="option-desc">매일 출퇴근해요</span>
              </button>
              <button
                type="button"
                className="option-card"
                onClick={() => handleCommuteAnswer(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span className="option-label">아니요</span>
                <span className="option-desc">재택 또는 불규칙해요</span>
              </button>
            </div>

            <button type="button" className="btn btn-ghost btn-back" onClick={goBack}>
              ← 이전
            </button>
          </section>
        )}

        {/* Step: Transport Mode */}
        {step === 'transport' && (
          <section className="onboarding-step transport-step">
            <div className="step-indicator">
              <span className="step-num">2</span>
              <span className="step-total">/ 3</span>
            </div>
            <h2>주로 어떻게 이동하세요?</h2>
            <p className="step-desc">가장 많이 사용하는 이동수단을 선택해주세요</p>

            <div className="transport-options">
              {TRANSPORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`transport-card ${data.transportMode === option.value ? 'selected' : ''}`}
                  onClick={() => handleTransportSelect(option.value)}
                >
                  <span className="transport-label">{option.label}</span>
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-ghost btn-back" onClick={goBack}>
              ← 이전
            </button>
          </section>
        )}

        {/* Step: Duration */}
        {step === 'duration' && (
          <section className="onboarding-step duration-step">
            <div className="step-indicator">
              <span className="step-num">3</span>
              <span className="step-total">/ 3</span>
            </div>
            <h2>출퇴근 시간은 얼마나 걸리나요?</h2>
            <p className="step-desc">대략적인 소요 시간을 알려주세요</p>

            <div className="duration-display">
              <span className="duration-value">{data.estimatedDuration}</span>
              <span className="duration-unit">분</span>
            </div>

            <div className="duration-presets">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-btn ${data.estimatedDuration === preset ? 'active' : ''}`}
                  onClick={() => handleDurationChange(preset)}
                >
                  {preset}분
                </button>
              ))}
            </div>

            <div className="duration-slider-container">
              <input
                id="duration-slider"
                type="range"
                className="duration-slider"
                min="10"
                max="120"
                step="5"
                value={data.estimatedDuration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                aria-label="예상 소요 시간"
              />
              <div className="slider-labels">
                <span>10분</span>
                <span>2시간</span>
              </div>
            </div>

            {error && <div className="notice error" role="alert">{error}</div>}

            <div className="step-actions">
              <button type="button" className="btn btn-ghost" onClick={goBack}>
                ← 이전
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={createRouteFromOnboarding}
                disabled={isCreating}
              >
                {isCreating ? '생성 중...' : '경로 생성하기'}
              </button>
            </div>
          </section>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <section className="onboarding-step complete-step">
            <div className="complete-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2>설정 완료!</h2>
            {data.hasCommute ? (
              <p className="complete-desc">
                출퇴근 경로가 생성되었어요.<br />
                이제 알림을 설정하면 매일 아침 날씨와 교통 정보를 받아볼 수 있어요!
              </p>
            ) : (
              <p className="complete-desc">
                언제든 경로를 설정할 수 있어요.<br />
                스톱워치 모드로 바로 시작해보세요!
              </p>
            )}

            {/* 알림 설정 추천 배너 */}
            {data.hasCommute && (
              <div className="alert-recommend-banner">
                <div className="recommend-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <div className="recommend-text">
                    <strong>출근 전 알림 받기</strong>
                    <span>날씨·교통 알림을 카카오톡으로 받아보세요</span>
                  </div>
                </div>
                <Link to="/alerts" className="btn btn-primary btn-sm">
                  알림 설정 →
                </Link>
              </div>
            )}

            <div className="complete-actions">
              {data.hasCommute ? (
                <>
                  <Link to="/alerts" className="btn btn-primary btn-lg">
                    알림 설정하기
                  </Link>
                  <Link to="/commute" className="btn btn-outline">
                    트래킹 시작하기
                  </Link>
                  <Link to="/" className="btn btn-ghost">
                    홈으로
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/commute/dashboard?tab=stopwatch" className="btn btn-primary btn-lg">
                    스톱워치로 시작
                  </Link>
                  <Link to="/routes" className="btn btn-ghost">
                    경로 설정하기
                  </Link>
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Progress bar */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="onboarding-progress">
          <div
            className="progress-fill"
            style={{
              width: step === 'commute-question' ? '33%' : step === 'transport' ? '66%' : '100%',
            }}
          />
        </div>
      )}

      <footer className="footer">
        <p className="footer-text">출퇴근 메이트 · 나의 출퇴근 동반자</p>
      </footer>
    </main>
  );
}

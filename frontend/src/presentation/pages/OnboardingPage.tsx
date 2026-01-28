import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const TRANSPORT_OPTIONS: { value: TransportMode; label: string; icon: string; description: string }[] = [
  { value: 'subway', label: '지하철', icon: '🚇', description: '주로 지하철로 이동해요' },
  { value: 'bus', label: '버스', icon: '🚌', description: '버스를 주로 이용해요' },
  { value: 'mixed', label: '지하철+버스', icon: '🔄', description: '여러 교통수단을 이용해요' },
  { value: 'car', label: '자가용', icon: '🚗', description: '자가용으로 출퇴근해요' },
  { value: 'walk', label: '도보/자전거', icon: '🚶', description: '걷거나 자전거로 이동해요' },
];

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function OnboardingPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';
  const userName = localStorage.getItem('userName') || '회원';
  const commuteApi = getCommuteApiClient();

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
    localStorage.setItem('onboardingCompleted', 'true');
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

      localStorage.setItem('onboardingCompleted', 'true');
      setStep('complete');
    } catch (err) {
      console.error('Failed to create route:', err);
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
            <div className="welcome-icon">👋</div>
            <h1>환영합니다{userName ? `, ${userName}님` : ''}!</h1>
            <p className="welcome-desc">
              출퇴근 메이트가 여러분의 출퇴근을 도와드릴게요.<br />
              간단한 설정으로 시작해볼까요?
            </p>
            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon">⏱️</span>
                <span>출퇴근 시간 기록</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>통계 및 분석</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
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
                <span className="option-icon">✅</span>
                <span className="option-label">네, 있어요</span>
                <span className="option-desc">매일 출퇴근해요</span>
              </button>
              <button
                type="button"
                className="option-card"
                onClick={() => handleCommuteAnswer(false)}
              >
                <span className="option-icon">🏠</span>
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
                  <span className="transport-icon">{option.icon}</span>
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
                type="range"
                className="duration-slider"
                min="10"
                max="120"
                step="5"
                value={data.estimatedDuration}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
              />
              <div className="slider-labels">
                <span>10분</span>
                <span>2시간</span>
              </div>
            </div>

            {error && <div className="notice error">{error}</div>}

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
            <div className="complete-icon">🎉</div>
            <h2>설정 완료!</h2>
            {data.hasCommute ? (
              <p className="complete-desc">
                출퇴근 경로가 생성되었어요.<br />
                이제 출퇴근 시간을 기록해보세요!
              </p>
            ) : (
              <p className="complete-desc">
                언제든 경로를 설정할 수 있어요.<br />
                스톱워치 모드로 바로 시작해보세요!
              </p>
            )}

            <div className="complete-actions">
              {data.hasCommute ? (
                <>
                  <Link to="/commute" className="btn btn-primary btn-lg">
                    트래킹 시작하기
                  </Link>
                  <Link to="/" className="btn btn-ghost">
                    홈으로
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/commute?mode=stopwatch" className="btn btn-primary btn-lg">
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

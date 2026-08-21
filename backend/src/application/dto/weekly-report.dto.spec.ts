import { ValidationPipe } from '@nestjs/common';
import { WeeklyReportQueryDto } from './weekly-report.dto';

/**
 * 회귀 방지: 이 DTO는 한동안 정의만 되어 있고 컨트롤러에 배선되지 않았다.
 * 그 사이 `commute.controller`는 `parseInt(raw, 10) || 0`을 직접 썼고,
 * `?weekOffset=abc`가 400이 아니라 **조용히 이번 주 리포트**로 바뀌었다.
 * 사용자는 요청한 적 없는 주차의 답을 정상 결과로 받는다.
 *
 * 파이프를 실제로 통과시켜 검증이 살아 있는지 본다 — 컨트롤러 메서드를 직접
 * 호출하는 스펙은 전역 파이프를 거치지 않아 이 회귀를 잡지 못한다.
 */
describe('WeeklyReportQueryDto - weekOffset 검증', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  const metadata = {
    type: 'query' as const,
    metatype: WeeklyReportQueryDto,
  };

  it('weekOffset이 없으면 undefined로 통과한다 (컨트롤러가 0으로 기본값 처리)', async () => {
    const result = (await pipe.transform({}, metadata)) as WeeklyReportQueryDto;

    expect(result.weekOffset).toBeUndefined();
  });

  it('쿼리스트링 문자열 "2"를 숫자 2로 변환한다', async () => {
    const result = (await pipe.transform({ weekOffset: '2' }, metadata)) as WeeklyReportQueryDto;

    expect(result.weekOffset).toBe(2);
  });

  it('숫자가 아닌 값은 0주차로 접지 않고 거부한다', async () => {
    await expect(pipe.transform({ weekOffset: 'abc' }, metadata)).rejects.toThrow();
  });

  it('상한(4)을 넘는 값은 거부한다', async () => {
    await expect(pipe.transform({ weekOffset: '5' }, metadata)).rejects.toThrow();
  });

  it('음수는 거부한다', async () => {
    await expect(pipe.transform({ weekOffset: '-1' }, metadata)).rejects.toThrow();
  });
});

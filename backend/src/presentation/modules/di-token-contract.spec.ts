import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 회귀 방지: **주입 토큰이 모듈의 `provide` 와 어긋나면 `@Optional()` 이 조용히 null 을 준다.**
 *
 * `data-retention.service.ts:15` 의 주석이 이 함정을 경고하고 있었지만, 실제로 어긋난 자리가
 * 있는지는 아무도 대조하지 않았다. 실측하니 `BehaviorController` 가 그 자리였다:
 *
 * | 주입 | 토큰 | 모듈이 제공하는 것 | 결과 |
 * |---|---|---|---|
 * | `userPatternRepository` | 문자열 `'USER_PATTERN_REPOSITORY'` | `Symbol('IUserPatternRepository')` | **null** |
 * | `commuteRecordRepository` | 문자열 `'COMMUTE_RECORD_REPOSITORY'` | `Symbol('ICommuteRecordRepository')` | **null** |
 *
 * Nest 는 토큰을 **동일성**으로 찾는다. 문자열 `'USER_PATTERN_REPOSITORY'` 와
 * `Symbol('USER_PATTERN_REPOSITORY')` 는 설명이 같아도 서로 다른 토큰이고,
 * 같은 이름의 Symbol 을 두 번 만들어도(`Symbol()` 은 매번 새 값) 서로 다른 토큰이다.
 *
 * `@Optional()` 이 붙어 있어 **앱은 정상 기동한다.** 대신 `GET /behavior/patterns/:userId`
 * 와 `/behavior/commute-history/:userId` 가 데이터와 무관하게 빈 배열을 돌려주고,
 * `/behavior/analytics/:userId` 는 항상 0 과 `hasEnoughData:false` 를 돌려준다.
 * **조회 실패가 "데이터 없음"으로 위장**하는 형태라 로그에도 흔적이 남지 않는다.
 *
 * 이 축은 **일반 스펙이 구조적으로 못 본다.** `behavior.controller.spec.ts` 는
 * `{ provide: 'USER_PATTERN_REPOSITORY', useValue: mock }` 으로 **문자열 토큰을 직접 제공**해
 * 컨트롤러를 만든다 — 테스트 안에서는 주입이 항상 성공하므로 실제 모듈의 어긋남을 볼 수 없다.
 * 그래서 픽스처가 아니라 **모듈 메타데이터**를 정본으로 삼아 대조한다.
 */

type Token = unknown;

/** 모듈이 인스턴스를 만드는 클래스 참조. `Function` 은 eslint 가 막는다. */
type ClassRef = abstract new (...args: never[]) => unknown;

interface ModuleMeta {
  name: string;
  imports: unknown[];
  controllers: ClassRef[];
  providers: unknown[];
  exports: unknown[];
}

function moduleFiles(): string[] {
  return fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.module.ts'))
    .sort();
}

/** `provide:` 가 있으면 그 토큰, 없으면 클래스 자신이 토큰이다. */
function tokenOf(provider: unknown): Token {
  if (provider && typeof provider === 'object' && 'provide' in provider) {
    return (provider as { provide: Token }).provide;
  }
  return provider;
}

/** 클래스가 아닌 토큰(문자열·Symbol)만 계약 대상이다. 클래스 토큰은 Nest 가 자동 해결한다. */
function isCustomToken(token: Token): token is string | symbol {
  return typeof token === 'string' || typeof token === 'symbol';
}

function describeToken(token: Token): string {
  if (typeof token === 'symbol') return String(token);
  if (typeof token === 'string') return `'${token}'`;
  return (token as { name?: string })?.name ?? String(token);
}

/**
 * `@Module({...})` 은 **선언한 키만** 메타데이터로 남긴다. `user.module.ts` 처럼 `imports` 가
 * 없는 모듈도 있으므로 네 키 중 하나라도 있으면 모듈로 본다 — 한 키만 보면 스윕이 조용히 샌다.
 */
const MODULE_KEYS = ['imports', 'controllers', 'providers', 'exports'] as const;

function isModuleClass(value: unknown): boolean {
  return MODULE_KEYS.some((key) => Reflect.getMetadata(key, value as object) !== undefined);
}

/**
 * **의도적으로 주입하지 않는 자리.** 코드가 이유를 적어 둔 것만 넣는다.
 * 새 항목을 넣을 때는 "왜 null 이어도 되는지"를 반드시 함께 적는다 —
 * 사유 없는 예외가 쌓이면 이 계약은 아무것도 지키지 않게 된다.
 */
const ALLOWED_UNRESOLVED: { module: string; klass: string; token: string; reason: string }[] = [
  {
    module: 'BehaviorModule',
    klass: 'EnhancedPatternAnalysisService',
    token: 'Symbol(ICommuteSessionRepository)',
    reason:
      'null 일 때 막히는 것은 analyzeRouteSegments 하나뿐이고, 이 메서드는 프로덕션 소비처가 ' +
      '0건이다(runFullAnalysis 도 호출하지 않는다). 죽은 메서드를 살리려고 BehaviorModule 에 ' +
      'CommuteModule 을 들이면 모듈 그래프만 넓어진다. 소비처가 생기면 그때 배선한다.',
  },
  {
    module: 'SmartDepartureModule',
    klass: 'CalculateDepartureUseCase',
    token: 'Symbol(LIVE_ACTIVITY_PUSH_SERVICE)',
    reason:
      'calculate-departure.use-case.ts 의 notifyLiveActivityUpdate 가 "LiveActivityModule 이 ' +
      'SmartDepartureModule 에 주입되면 배선한다"고 명시한 미완성 지점이다. 배선은 곧 APNs ' +
      '실발송이라 외부 노출 게이트에 해당한다 — 자동 리뷰가 임의로 켤 자리가 아니다.',
  },
];

function isAllowed(module: string, klass: string, token: string): boolean {
  return ALLOWED_UNRESOLVED.some(
    (a) => a.module === module && a.klass === klass && a.token === token,
  );
}

function readMeta(mod: unknown): ModuleMeta | null {
  if (typeof mod !== 'function') return null;
  return {
    name: (mod as ClassRef).name,
    imports: (Reflect.getMetadata('imports', mod) as unknown[]) ?? [],
    controllers: (Reflect.getMetadata('controllers', mod) as ClassRef[]) ?? [],
    providers: (Reflect.getMetadata('providers', mod) as unknown[]) ?? [],
    exports: (Reflect.getMetadata('exports', mod) as unknown[]) ?? [],
  };
}

/**
 * 모듈이 해결할 수 있는 토큰 = 자기 providers + (import 한 모듈이 export 하는 것).
 * DynamicModule(`TypeOrmModule.forFeature(...)` 등)은 객체로 오므로 그 providers/exports 를 본다.
 */
function resolvableTokens(mod: unknown, seen = new Set<unknown>()): Set<Token> {
  const resolved = new Set<Token>();
  if (seen.has(mod)) return resolved;
  seen.add(mod);

  const meta = readMeta(mod);
  const imports = meta
    ? meta.imports
    : ((mod as { imports?: unknown[] })?.imports ?? []);
  const providers = meta
    ? meta.providers
    : ((mod as { providers?: unknown[] })?.providers ?? []);

  for (const provider of providers) resolved.add(tokenOf(provider));

  for (const imported of imports) {
    const importedMeta = readMeta(imported);
    if (importedMeta) {
      for (const exported of importedMeta.exports) {
        // 모듈을 통째로 re-export 하면 그 모듈이 해결하는 것을 함께 물려받는다.
        if (typeof exported === 'function' && isModuleClass(exported)) {
          for (const t of resolvableTokens(exported, seen)) resolved.add(t);
        }
        resolved.add(tokenOf(exported));
      }
      continue;
    }
    // DynamicModule
    const dynamic = imported as { providers?: unknown[]; exports?: unknown[]; module?: unknown };
    for (const provider of dynamic?.providers ?? []) resolved.add(tokenOf(provider));
    for (const exported of dynamic?.exports ?? []) resolved.add(tokenOf(exported));
  }

  return resolved;
}

/** 모듈이 인스턴스를 만드는 클래스 전부 — 컨트롤러 + 클래스 provider + `useClass` 대상. */
function instantiatedClasses(meta: ModuleMeta): ClassRef[] {
  const classes: ClassRef[] = [...meta.controllers];
  for (const provider of meta.providers) {
    if (typeof provider === 'function') classes.push(provider as ClassRef);
    else if (provider && typeof provider === 'object' && 'useClass' in provider) {
      classes.push((provider as { useClass: ClassRef }).useClass);
    }
  }
  return classes;
}

/** `@Inject(token)` 으로 명시한 파라미터 토큰들. */
function injectedTokens(cls: ClassRef): Token[] {
  const self = (Reflect.getMetadata('self:paramtypes', cls) as
    | { index: number; param?: Token }[]
    | undefined) ?? [];
  return self.filter((p) => p.param !== undefined).map((p) => p.param as Token);
}

describe('DI 토큰 계약: 주입 토큰은 그 클래스를 등록한 모듈이 반드시 제공한다', () => {
  const modules = moduleFiles().map((file) => {
    const exported = require(path.join(__dirname, file)) as Record<string, unknown>;
    const moduleClass = Object.values(exported).find(
      (value) => typeof value === 'function' && isModuleClass(value),
    );
    return { file, moduleClass };
  });

  it('모듈 파일에서 @Module 클래스를 찾을 수 있다 (스윕이 조용히 비지 않도록)', () => {
    const missing = modules.filter((m) => !m.moduleClass).map((m) => m.file);
    expect(missing).toEqual([]);
    expect(modules.length).toBeGreaterThan(20);
  });

  it('[대조군] 스윕이 실제로 주입 지점을 읽어낸다', () => {
    // 이런 계약 테스트의 전형적인 무력화 방식은 파서가 조용히 0건을 읽고 "불일치 없음"으로
    // 통과하는 것이다. 착수 시 실측값은 모듈 26 · 클래스 140 · 커스텀 토큰 주입 181건이었다.
    let classes = 0;
    let injections = 0;

    for (const { moduleClass } of modules) {
      if (!moduleClass) continue;
      const meta = readMeta(moduleClass);
      if (!meta) continue;
      for (const cls of instantiatedClasses(meta)) {
        classes++;
        injections += injectedTokens(cls).filter(isCustomToken).length;
      }
    }

    expect(classes).toBeGreaterThan(100);
    expect(injections).toBeGreaterThan(150);
  });

  it('어긋난 주입 토큰이 없다 (@Optional() 이 조용히 null 을 주는 자리)', () => {
    const mismatches: string[] = [];

    for (const { moduleClass } of modules) {
      if (!moduleClass) continue;
      const meta = readMeta(moduleClass);
      if (!meta) continue;
      const resolvable = resolvableTokens(moduleClass);

      for (const cls of instantiatedClasses(meta)) {
        for (const token of injectedTokens(cls)) {
          if (!isCustomToken(token)) continue;
          if (resolvable.has(token)) continue;
          if (isAllowed(meta.name, cls.name, describeToken(token))) continue;
          mismatches.push(
            `${meta.name} → ${cls.name} 이 ${describeToken(token)} 를 주입하는데 모듈이 제공하지 않는다`,
          );
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('허용 목록에 낡은 항목이 없다 (배선되면 예외도 걷어낸다)', () => {
    const stale: string[] = [];

    for (const allowed of ALLOWED_UNRESOLVED) {
      const entry = modules.find(
        (m) => m.moduleClass && readMeta(m.moduleClass)?.name === allowed.module,
      );
      const meta = entry?.moduleClass ? readMeta(entry.moduleClass) : null;
      if (!meta) {
        stale.push(`${allowed.module} 모듈이 더 이상 없다`);
        continue;
      }
      const cls = instantiatedClasses(meta).find((c) => c.name === allowed.klass);
      if (!cls) {
        stale.push(`${allowed.module} 이 더 이상 ${allowed.klass} 를 등록하지 않는다`);
        continue;
      }
      const resolvable = resolvableTokens(entry!.moduleClass);
      const stillUnresolved = injectedTokens(cls).some(
        (t) => isCustomToken(t) && !resolvable.has(t) && describeToken(t) === allowed.token,
      );
      if (!stillUnresolved) {
        stale.push(
          `${allowed.module} → ${allowed.klass} 의 ${allowed.token} 는 이제 해결된다 — 허용 목록에서 지울 것`,
        );
      }
    }

    expect(stale).toEqual([]);
  });
});

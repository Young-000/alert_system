import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../src/infrastructure/persistence/typeorm/entities';

/**
 * 테스트용 데이터베이스 모듈
 * SQLite 인메모리 데이터베이스를 사용하여 E2E 테스트 실행
 *
 * 엔티티 목록은 프로덕션과 동일한 `ALL_ENTITIES`를 쓴다.
 * 여기서 목록을 따로 관리하면 새 엔티티가 추가될 때마다 e2e만 뒤처진다.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      entities: ALL_ENTITIES,
      synchronize: true,
      dropSchema: true,
    }),
    TypeOrmModule.forFeature(ALL_ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class TestDatabaseModule {}

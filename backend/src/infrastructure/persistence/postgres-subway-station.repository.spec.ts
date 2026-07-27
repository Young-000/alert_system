import { DataSource } from 'typeorm';
import { PostgresSubwayStationRepository } from './postgres-subway-station.repository';

type QueryBuilderStub = {
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  getMany: jest.Mock;
};

function createRepository(dbType: string) {
  const queryBuilder: QueryBuilderStub = {
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.orderBy.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);

  const dataSource = {
    options: { type: dbType },
    getRepository: () => ({
      createQueryBuilder: () => queryBuilder,
    }),
  } as unknown as DataSource;

  return {
    repository: new PostgresSubwayStationRepository(dataSource),
    queryBuilder,
  };
}

describe('PostgresSubwayStationRepository', () => {
  describe('searchByName - SQL dialect', () => {
    it('uses ILIKE on postgres', async () => {
      const { repository, queryBuilder } = createRepository('postgres');

      await repository.searchByName('강남', 10);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'station.name ILIKE :name',
        { name: '%강남%' },
      );
    });

    // ILIKE는 PostgreSQL 전용이다. 아래 드라이버에 ILIKE가 새어 나가면
    // `near "ILIKE": syntax error`로 역 검색 API가 통째로 500이 된다.
    // sqljs는 e2e 테스트 DB라 실제로 이 사고가 났었다.
    it.each(['sqljs', 'sqlite', 'better-sqlite3'])(
      'uses portable LOWER() + LIKE on %s',
      async (dbType) => {
        const { repository, queryBuilder } = createRepository(dbType);

        await repository.searchByName('강남', 10);

        expect(queryBuilder.where).toHaveBeenCalledWith(
          'LOWER(station.name) LIKE LOWER(:name)',
          { name: '%강남%' },
        );
      },
    );
  });

  describe('searchByName - guard clauses', () => {
    it('returns empty array without querying for a blank query', async () => {
      const { repository, queryBuilder } = createRepository('postgres');

      await expect(repository.searchByName('   ', 10)).resolves.toEqual([]);
      expect(queryBuilder.where).not.toHaveBeenCalled();
    });

    it('trims the query before matching', async () => {
      const { repository, queryBuilder } = createRepository('postgres');

      await repository.searchByName('  강남  ', 10);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'station.name ILIKE :name',
        { name: '%강남%' },
      );
    });
  });
});

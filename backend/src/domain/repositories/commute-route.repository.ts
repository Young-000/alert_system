import { CommuteRoute, RouteType } from '@domain/entities/commute-route.entity';

export interface ICommuteRouteRepository {
  save(route: CommuteRoute): Promise<CommuteRoute>;
  findById(id: string): Promise<CommuteRoute | undefined>;
  findByIds(ids: string[]): Promise<CommuteRoute[]>;
  findByUserId(userId: string): Promise<CommuteRoute[]>;
  findByUserIdAndType(userId: string, routeType: RouteType): Promise<CommuteRoute[]>;
  findPreferredByUserId(userId: string, routeType: RouteType): Promise<CommuteRoute | undefined>;
  update(route: CommuteRoute): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<number>;
}

export const COMMUTE_ROUTE_REPOSITORY = Symbol('ICommuteRouteRepository');

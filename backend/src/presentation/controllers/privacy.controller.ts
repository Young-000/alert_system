import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExportUserDataUseCase, ExportedUserData } from '../../application/use-cases/export-user-data.use-case';
import { DataRetentionService } from '../../application/services/data-retention.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

/**
 * Privacy Controller
 * Handles user data export and deletion for GDPR/privacy compliance
 */
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class PrivacyController {
  constructor(
    private readonly exportUserDataUseCase: ExportUserDataUseCase,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  /**
   * Export all user data (GDPR data portability)
   * GET /users/:id/export-data
   */
  @Get(':id/export-data')
  async exportUserData(
    @Param('id') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ExportedUserData> {
    // 권한 검사: 자신의 데이터만 내보내기 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 데이터에 접근할 수 없습니다.');
    }
    return this.exportUserDataUseCase.execute(userId);
  }

  /**
   * Delete all user behavior/tracking data (GDPR right to erasure)
   * DELETE /users/:id/delete-all-data
   * Note: This deletes tracking data only, not the user account itself
   */
  @Delete(':id/delete-all-data')
  @HttpCode(HttpStatus.OK)
  async deleteAllUserData(
    @Param('id') userId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; deleted: { behaviorEvents: number; commuteRecords: number } }> {
    // 권한 검사: 자신의 데이터만 삭제 가능
    if (userId !== req.user.userId) {
      throw new ForbiddenException('다른 사용자의 데이터를 삭제할 수 없습니다.');
    }
    const deleted = await this.dataRetentionService.deleteAllUserData(userId);

    return {
      message: 'User tracking data deleted successfully',
      deleted,
    };
  }
}

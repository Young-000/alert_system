import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExportUserDataUseCase, ExportedUserData } from '../../application/use-cases/export-user-data.use-case';
import { DataRetentionService } from '../../application/services/data-retention.service';

/**
 * Privacy Controller
 * Handles user data export and deletion for GDPR/privacy compliance
 */
@Controller('users')
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
  async exportUserData(@Param('id') userId: string): Promise<ExportedUserData> {
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
  ): Promise<{ message: string; deleted: { behaviorEvents: number; commuteRecords: number } }> {
    const deleted = await this.dataRetentionService.deleteAllUserData(userId);

    return {
      message: 'User tracking data deleted successfully',
      deleted,
    };
  }
}

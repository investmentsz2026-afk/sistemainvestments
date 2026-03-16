import { Module } from '@nestjs/common';
import { ProcessAuditsController } from './process-audits.controller';
import { ProcessAuditsService } from './process-audits.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [DatabaseModule, NotificationsModule],
    controllers: [ProcessAuditsController],
    providers: [ProcessAuditsService],
})
export class ProcessAuditsModule { }

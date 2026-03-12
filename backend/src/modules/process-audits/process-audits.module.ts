import { Module } from '@nestjs/common';
import { ProcessAuditsController } from './process-audits.controller';
import { ProcessAuditsService } from './process-audits.service';

@Module({
    controllers: [ProcessAuditsController],
    providers: [ProcessAuditsService],
})
export class ProcessAuditsModule { }

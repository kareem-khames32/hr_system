import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LettersModule } from '../letters/letters.module'
import { HrDocumentTemplate, HrDocumentTemplateRevision, HrIssuedDocument } from './hr-document.entities'
import { HrDocumentsController } from './hr-documents.controller'
import { HrDocumentsService } from './hr-documents.service'

@Module({ imports: [LettersModule, TypeOrmModule.forFeature([HrDocumentTemplate, HrDocumentTemplateRevision, HrIssuedDocument])],
  controllers: [HrDocumentsController], providers: [HrDocumentsService], exports: [HrDocumentsService] })
export class HrDocumentsModule {}

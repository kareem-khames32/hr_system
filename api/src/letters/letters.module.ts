import { Module } from '@nestjs/common'
import { LettersService } from './letters.service'
import { LettersController } from './letters.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LetterTemplate, LetterTemplateBinding, LetterTemplateRevision } from './letter-template.entities'
import { LetterRenderer } from './letter-renderer.service'
import { LetterTemplatesService } from './letter-templates.service'

@Module({ imports: [TypeOrmModule.forFeature([LetterTemplate, LetterTemplateBinding, LetterTemplateRevision])], providers: [LettersService, LetterTemplatesService, LetterRenderer], controllers: [LettersController], exports: [LettersService, LetterTemplatesService, LetterRenderer] })
export class LettersModule {}

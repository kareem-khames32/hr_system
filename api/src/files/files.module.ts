import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FilesController } from './files.controller'
import { StoredFile } from './stored-file.entity'
import { RequestsModule } from '../requests/requests.module'
import { CommentsModule } from '../comments/comments.module'
import { AnnouncementsModule } from '../announcements/announcements.module'
import { CasesModule } from '../cases/cases.module'

@Module({
  imports: [RequestsModule, CommentsModule, AnnouncementsModule, CasesModule, TypeOrmModule.forFeature([StoredFile])],
  controllers: [FilesController],
})
export class FilesModule {}

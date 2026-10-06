import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FilesController } from './files.controller'
import { StoredFile } from './stored-file.entity'
import { RequestsModule } from '../requests/requests.module'
import { CommentsModule } from '../comments/comments.module'

@Module({
  imports: [RequestsModule, CommentsModule, TypeOrmModule.forFeature([StoredFile])],
  controllers: [FilesController],
})
export class FilesModule {}

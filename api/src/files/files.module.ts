import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FilesController } from './files.controller'
import { StoredFile } from './stored-file.entity'

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile])],
  controllers: [FilesController],
})
export class FilesModule {}

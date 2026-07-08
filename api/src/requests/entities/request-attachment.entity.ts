import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('request_attachments')
export class RequestAttachment {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  requestId: number

  @Column({ length: 500 })
  fileRef: string

  @Column({ length: 50, nullable: true })
  type: string // medical_report | iban_letter | invoice ...
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// الملف المخزّن فعلياً على القرص (uploads/) — مربوط بسجلّه
@Entity('stored_files')
export class StoredFile {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 300 })
  originalName: string

  // اسم التخزين الفعلي على القرص (YYYY-MM/uuid.ext)
  @Column({ length: 300 })
  storedName: string

  @Column({ length: 100 })
  mime: string

  @Column()
  size: number

  // ربط الملف بسجله: document | request | custody | employee
  @Index()
  @Column({ length: 30, nullable: true })
  entityType: string

  @Index()
  @Column({ nullable: true })
  entityId: number

  @Column({ nullable: true })
  uploadedBy: number // users.id

  // صاحب الملف (للاطلاع الذاتي في البورتال)
  @Column({ nullable: true })
  employeeId: number

  @CreateDateColumn()
  uploadedAt: Date

  // B2.2 (ترحيل 085): بصمة SHA-256 للمحتوى — برّه الكيان للقراءة والكتابة (الكود قبل الترحيل)، بتتكتب بـSQL صريح بعد التأكد
  // من وجود العمود (stored-file-hash.ts). القديم من غير بصمة.
  @Column({ type: 'nvarchar', length: 64, nullable: true, select: false, insert: false, update: false })
  sha256?: string | null
}

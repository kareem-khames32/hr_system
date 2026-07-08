import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'

// ===== الفروع =====
export class CreateBranchDto {
  @IsString({ message: 'اسم الفرع مطلوب' })
  @MinLength(2, { message: 'اسم الفرع قصير جداً' })
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsString({ message: 'كود الفرع مطلوب' })
  @Matches(/^[A-Za-z0-9-]{2,20}$/, {
    message: 'كود الفرع: حروف إنجليزية وأرقام وشرطة فقط',
  })
  code: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsEmail({}, { message: 'بريد الفرع غير صالح' })
  email?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  costCenter?: string

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, {
    message: 'كود الفرع: حروف إنجليزية وأرقام وشرطة فقط',
  })
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsEmail({}, { message: 'بريد الفرع غير صالح' })
  email?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  costCenter?: string

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ===== الأقسام =====
export class CreateDepartmentDto {
  @IsString({ message: 'اسم القسم مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @Type(() => Number)
  @IsInt({ message: 'فرع القسم مطلوب' })
  branchId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ===== الفرق =====
export class CreateTeamDto {
  @IsString({ message: 'اسم الفريق مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @Type(() => Number)
  @IsInt({ message: 'قسم الفريق مطلوب' })
  departmentId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaderEmployeeId?: number
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaderEmployeeId?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

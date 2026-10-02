import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_ACTIVITY_LENGTH, MAX_OWN_ACTIVITIES, cleanActivity } from '../../domain/cardio-session.entity';

export class CardioDto {
  @IsDateString()
  date: string;

  /** A built-in key ("run") or the user's own activity ("Padel"). */
  @Transform(({ value }) => (typeof value === 'string' ? cleanActivity(value) : value))
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_ACTIVITY_LENGTH)
  activity: string;

  /** 1 second … 24 hours. */
  @IsInt()
  @Min(1)
  @Max(24 * 60 * 60)
  durationSeconds: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  distanceKm?: number | null;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(250)
  avgHeartRate?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20000)
  calories?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Your whole list of your own activities, in the order to show them. */
export class OwnActivitiesDto {
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? cleanActivity(v) : v)) : value,
  )
  @IsArray()
  @ArrayMaxSize(MAX_OWN_ACTIVITIES)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(MAX_ACTIVITY_LENGTH, { each: true })
  activities: string[];
}

import { IsDateString, IsNumber, Max, Min } from 'class-validator';

export class LogBodyWeightDto {
  @IsDateString()
  date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(400)
  weight: number;
}

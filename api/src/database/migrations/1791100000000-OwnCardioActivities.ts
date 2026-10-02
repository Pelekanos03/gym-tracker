import { MigrationInterface, QueryRunner } from "typeorm";

export class OwnCardioActivities1791100000000 implements MigrationInterface {
    name = 'OwnCardioActivities1791100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "cardio_activities" text NOT NULL DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "cardio_activities"`);
    }

}

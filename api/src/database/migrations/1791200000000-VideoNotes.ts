import { MigrationInterface, QueryRunner } from "typeorm";

export class VideoNotes1791200000000 implements MigrationInterface {
    name = 'VideoNotes1791200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set_logs" ADD "video_note" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set_logs" DROP COLUMN "video_note"`);
    }

}

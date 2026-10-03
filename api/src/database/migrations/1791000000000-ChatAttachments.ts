import { MigrationInterface, QueryRunner } from "typeorm";

export class ChatAttachments1791000000000 implements MigrationInterface {
    name = 'ChatAttachments1791000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "attachment_file" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "attachment_name" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "attachment_type" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "attachment_size" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_size"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_type"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_name"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "attachment_file"`);
    }

}

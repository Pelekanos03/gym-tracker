import { MigrationInterface, QueryRunner } from "typeorm";

export class Avatars1791300000000 implements MigrationInterface {
    name = 'Avatars1791300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_file" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_file"`);
    }

}

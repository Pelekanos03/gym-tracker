import { MigrationInterface, QueryRunner } from "typeorm";

export class SetOrder1790884218264 implements MigrationInterface {
    name = 'SetOrder1790884218264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set_logs" ADD "order_index" integer NOT NULL DEFAULT '0'`);
        // Existing sets had no stored order. Recover it from physical row
        // order (ctid), which follows insertion order — and a session edit
        // re-inserts all its sets, so it matches what the lifter last saved.
        await queryRunner.query(`
            UPDATE "set_logs" s SET "order_index" = r.rn
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY "sessionId" ORDER BY ctid) AS rn
                FROM "set_logs"
            ) r
            WHERE r.id = s.id`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "set_logs" DROP COLUMN "order_index"`);
    }

}

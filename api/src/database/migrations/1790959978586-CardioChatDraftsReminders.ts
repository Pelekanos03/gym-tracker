import { MigrationInterface, QueryRunner } from "typeorm";

export class CardioChatDraftsReminders1790959978586 implements MigrationInterface {
    name = 'CardioChatDraftsReminders1790959978586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "workout_drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "data" text NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_896c75e97b91f17fa5022f8184" UNIQUE ("userId"), CONSTRAINT "PK_a669d7bd00abe38461b75e2e972" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cardio_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "activity" character varying NOT NULL, "duration_seconds" integer NOT NULL, "distance_km" double precision, "avg_heart_rate" integer, "calories" integer, "notes" text NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_dc16002d3af4f454b2b14eaf5b9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderId" uuid NOT NULL, "recipientId" uuid NOT NULL, "body" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0733abd1e28640214b2efda4cb" ON "messages" ("recipientId", "read_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_47efdbec2c604baa7211822de8" ON "messages" ("senderId", "recipientId", "created_at") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "weight_reminder" character varying NOT NULL DEFAULT 'off'`);
        await queryRunner.query(`ALTER TABLE "workout_drafts" ADD CONSTRAINT "FK_896c75e97b91f17fa5022f81841" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cardio_sessions" ADD CONSTRAINT "FK_6ab1e83ff13cecc105bf29ae8be" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_f548818d46a1315d4e1d5e62da5" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_f548818d46a1315d4e1d5e62da5"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce"`);
        await queryRunner.query(`ALTER TABLE "cardio_sessions" DROP CONSTRAINT "FK_6ab1e83ff13cecc105bf29ae8be"`);
        await queryRunner.query(`ALTER TABLE "workout_drafts" DROP CONSTRAINT "FK_896c75e97b91f17fa5022f81841"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "weight_reminder"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_47efdbec2c604baa7211822de8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0733abd1e28640214b2efda4cb"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "cardio_sessions"`);
        await queryRunner.query(`DROP TABLE "workout_drafts"`);
    }

}

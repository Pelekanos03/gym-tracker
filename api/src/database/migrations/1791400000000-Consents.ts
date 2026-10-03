import { MigrationInterface, QueryRunner } from "typeorm";

export class Consents1791400000000 implements MigrationInterface {
    name = 'Consents1791400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Existing accounts never gave explicit health-data consent, so it starts empty; the app asks once.
        await queryRunner.query(`ALTER TABLE "users" ADD "health_consent_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "consent_partners" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "consent_ai" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TABLE "consent_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purpose" character varying NOT NULL, "granted" boolean NOT NULL, "policy_version" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_consent_events_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_consent_events_user_created" ON "consent_events" ("userId", "created_at") `);
        await queryRunner.query(`ALTER TABLE "consent_events" ADD CONSTRAINT "FK_consent_events_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "consent_events" DROP CONSTRAINT "FK_consent_events_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_consent_events_user_created"`);
        await queryRunner.query(`DROP TABLE "consent_events"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "consent_ai"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "consent_partners"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "health_consent_at"`);
    }

}

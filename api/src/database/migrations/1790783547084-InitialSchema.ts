import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790783547084 implements MigrationInterface {
    name = 'InitialSchema1790783547084'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exercises" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "category" character varying NOT NULL, "primary_muscle" character varying NOT NULL, "is_competition_lift" boolean NOT NULL DEFAULT false, "ownerId" uuid, CONSTRAINT "PK_c4c46f5fa89a58ba7c2d894e3c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "program_exercises" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_index" integer NOT NULL DEFAULT '1', "target_sets" integer NOT NULL DEFAULT '3', "target_reps" integer NOT NULL DEFAULT '5', "target_rpe" double precision, "target_percent_1rm" double precision, "target_weight" double precision, "set_type" character varying NOT NULL DEFAULT 'WORKING', "notes" character varying NOT NULL DEFAULT '', "programDayId" uuid, "exerciseId" uuid, CONSTRAINT "PK_fcade61a45548d5cf1d0ff08140" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "program_days" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "week_number" integer NOT NULL DEFAULT '1', "day_number" integer NOT NULL DEFAULT '1', "name" character varying NOT NULL DEFAULT 'Training Day', "programId" uuid, CONSTRAINT "PK_cff1cb768e103fd904e79baf3e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying NOT NULL DEFAULT '', "length_weeks" integer NOT NULL DEFAULT '4', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "ownerId" uuid, CONSTRAINT "PK_d43c664bcaafc0e8a06dfd34e05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "set_drops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_index" integer NOT NULL, "weight" double precision NOT NULL, "reps" integer NOT NULL, "setId" uuid, CONSTRAINT "PK_55e92a4a9d69dc96dedece49f4b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "superset_partners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_index" integer NOT NULL, "weight" double precision NOT NULL, "reps" integer NOT NULL, "setId" uuid, "exerciseId" uuid, CONSTRAINT "PK_7e29da0ba536e06f37a513d428c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "set_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "set_number" integer NOT NULL DEFAULT '1', "weight" double precision NOT NULL, "reps" integer NOT NULL, "rpe" double precision, "set_type" character varying NOT NULL DEFAULT 'WORKING', "video_file" character varying, "sessionId" uuid, "exerciseId" uuid, CONSTRAINT "PK_6d8567751fb48250de033095dc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "training_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying NOT NULL DEFAULT 'ACTIVE', "started_on" date NOT NULL, "ended_on" date, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "programId" uuid, CONSTRAINT "PK_f13360c1ed5108866926e60dd92" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workout_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "block_week" integer, "block_day" integer, "date" date NOT NULL, "status" character varying NOT NULL DEFAULT 'COMPLETED', "notes" character varying NOT NULL DEFAULT '', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "programDayId" uuid, "blockId" uuid, CONSTRAINT "PK_eea00e05dc78d40b55a588c9f57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "friendships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "responded_at" TIMESTAMP WITH TIME ZONE, "requesterId" uuid, "addresseeId" uuid, CONSTRAINT "UQ_ae267b922c295ac548dd498e540" UNIQUE ("requesterId", "addresseeId"), CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "coachings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" character varying NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "responded_at" TIMESTAMP WITH TIME ZONE, "coachId" uuid, "clientId" uuid, CONSTRAINT "UQ_ae73c9ac3916dac5944db9502ca" UNIQUE ("coachId", "clientId"), CONSTRAINT "PK_73e143a5dfe93f491f25026b577" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "program_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "programId" uuid, "sharedWithId" uuid, CONSTRAINT "UQ_812efdcce88cb0c4e2c0fbf472b" UNIQUE ("programId", "sharedWithId"), CONSTRAINT "PK_416284742ffadcd61d3378706a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "body_weight_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "weight" double precision NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_f07b33bd702fdf8647115021af7" UNIQUE ("userId", "date"), CONSTRAINT "PK_07c54d77216135590e37939d3ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "exercises" ADD CONSTRAINT "FK_b7f424f1a19cab2e121cb7a488c" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "program_exercises" ADD CONSTRAINT "FK_59e80b657e7dca5eddcf4c6456b" FOREIGN KEY ("programDayId") REFERENCES "program_days"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "program_exercises" ADD CONSTRAINT "FK_f6be1e0f155a528dd8f922d558d" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "program_days" ADD CONSTRAINT "FK_3a3f0de5f84e6e251278da0e14e" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "programs" ADD CONSTRAINT "FK_f408f30aa43b87591efa3d04211" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_drops" ADD CONSTRAINT "FK_32bbed39a6dddb07457d0ce295d" FOREIGN KEY ("setId") REFERENCES "set_logs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "superset_partners" ADD CONSTRAINT "FK_f9406bd1d6c01de18c6a3b5a5b2" FOREIGN KEY ("setId") REFERENCES "set_logs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "superset_partners" ADD CONSTRAINT "FK_d98cbc4a6678d5dc0015f0db965" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_logs" ADD CONSTRAINT "FK_c03d46e87a79abc4cd39bdaf61c" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "set_logs" ADD CONSTRAINT "FK_f1f2fb10c258de0c31035f61cb6" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "training_blocks" ADD CONSTRAINT "FK_31e9f8722da1d61acd22704f798" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "training_blocks" ADD CONSTRAINT "FK_448adbef3aee6228688a64ec5cc" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_7633876410309eb0d1d9198ea00" FOREIGN KEY ("programDayId") REFERENCES "program_days"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" ADD CONSTRAINT "FK_8c8ec1bd7a3355ef8e2f850b221" FOREIGN KEY ("blockId") REFERENCES "training_blocks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_4f47ed519abe1ced044af260420" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coachings" ADD CONSTRAINT "FK_e0cf026cd10fca0d44f009feaf6" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coachings" ADD CONSTRAINT "FK_fba8b46198ce3d656040a241710" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "program_shares" ADD CONSTRAINT "FK_1d7961c673317c8042411a992c7" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "program_shares" ADD CONSTRAINT "FK_599560ad4285e738ec41d785adb" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "body_weight_entries" ADD CONSTRAINT "FK_68ff5b3d8db166eb22b8d247bb9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "body_weight_entries" DROP CONSTRAINT "FK_68ff5b3d8db166eb22b8d247bb9"`);
        await queryRunner.query(`ALTER TABLE "program_shares" DROP CONSTRAINT "FK_599560ad4285e738ec41d785adb"`);
        await queryRunner.query(`ALTER TABLE "program_shares" DROP CONSTRAINT "FK_1d7961c673317c8042411a992c7"`);
        await queryRunner.query(`ALTER TABLE "coachings" DROP CONSTRAINT "FK_fba8b46198ce3d656040a241710"`);
        await queryRunner.query(`ALTER TABLE "coachings" DROP CONSTRAINT "FK_e0cf026cd10fca0d44f009feaf6"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_4f47ed519abe1ced044af260420"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_8c8ec1bd7a3355ef8e2f850b221"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_7633876410309eb0d1d9198ea00"`);
        await queryRunner.query(`ALTER TABLE "workout_sessions" DROP CONSTRAINT "FK_b4b5ff8f7c2cb3c3c18e07cc5ce"`);
        await queryRunner.query(`ALTER TABLE "training_blocks" DROP CONSTRAINT "FK_448adbef3aee6228688a64ec5cc"`);
        await queryRunner.query(`ALTER TABLE "training_blocks" DROP CONSTRAINT "FK_31e9f8722da1d61acd22704f798"`);
        await queryRunner.query(`ALTER TABLE "set_logs" DROP CONSTRAINT "FK_f1f2fb10c258de0c31035f61cb6"`);
        await queryRunner.query(`ALTER TABLE "set_logs" DROP CONSTRAINT "FK_c03d46e87a79abc4cd39bdaf61c"`);
        await queryRunner.query(`ALTER TABLE "superset_partners" DROP CONSTRAINT "FK_d98cbc4a6678d5dc0015f0db965"`);
        await queryRunner.query(`ALTER TABLE "superset_partners" DROP CONSTRAINT "FK_f9406bd1d6c01de18c6a3b5a5b2"`);
        await queryRunner.query(`ALTER TABLE "set_drops" DROP CONSTRAINT "FK_32bbed39a6dddb07457d0ce295d"`);
        await queryRunner.query(`ALTER TABLE "programs" DROP CONSTRAINT "FK_f408f30aa43b87591efa3d04211"`);
        await queryRunner.query(`ALTER TABLE "program_days" DROP CONSTRAINT "FK_3a3f0de5f84e6e251278da0e14e"`);
        await queryRunner.query(`ALTER TABLE "program_exercises" DROP CONSTRAINT "FK_f6be1e0f155a528dd8f922d558d"`);
        await queryRunner.query(`ALTER TABLE "program_exercises" DROP CONSTRAINT "FK_59e80b657e7dca5eddcf4c6456b"`);
        await queryRunner.query(`ALTER TABLE "exercises" DROP CONSTRAINT "FK_b7f424f1a19cab2e121cb7a488c"`);
        await queryRunner.query(`DROP TABLE "body_weight_entries"`);
        await queryRunner.query(`DROP TABLE "program_shares"`);
        await queryRunner.query(`DROP TABLE "coachings"`);
        await queryRunner.query(`DROP TABLE "friendships"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "workout_sessions"`);
        await queryRunner.query(`DROP TABLE "training_blocks"`);
        await queryRunner.query(`DROP TABLE "set_logs"`);
        await queryRunner.query(`DROP TABLE "superset_partners"`);
        await queryRunner.query(`DROP TABLE "set_drops"`);
        await queryRunner.query(`DROP TABLE "programs"`);
        await queryRunner.query(`DROP TABLE "program_days"`);
        await queryRunner.query(`DROP TABLE "program_exercises"`);
        await queryRunner.query(`DROP TABLE "exercises"`);
    }

}

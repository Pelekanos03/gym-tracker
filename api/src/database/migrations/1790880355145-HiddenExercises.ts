import { MigrationInterface, QueryRunner } from "typeorm";

export class HiddenExercises1790880355145 implements MigrationInterface {
    name = 'HiddenExercises1790880355145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hidden_exercises" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "exerciseId" uuid, CONSTRAINT "UQ_b9758c44d41f54e221857ae5955" UNIQUE ("userId", "exerciseId"), CONSTRAINT "PK_4174641160110131f2dac738940" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "hidden_exercises" ADD CONSTRAINT "FK_feedba4494db820c5fe7b110074" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hidden_exercises" ADD CONSTRAINT "FK_8963a0a6c22eceb02dbf9613455" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hidden_exercises" DROP CONSTRAINT "FK_8963a0a6c22eceb02dbf9613455"`);
        await queryRunner.query(`ALTER TABLE "hidden_exercises" DROP CONSTRAINT "FK_feedba4494db820c5fe7b110074"`);
        await queryRunner.query(`DROP TABLE "hidden_exercises"`);
    }

}

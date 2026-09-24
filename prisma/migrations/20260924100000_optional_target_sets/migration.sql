-- AlterTable
ALTER TABLE "Exercise" ALTER COLUMN "targetSets" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutExercise" ADD COLUMN "targetSets" INTEGER NOT NULL DEFAULT 0;

-- Backfill : les séances existantes gardent le nombre de séries actuel de chaque exercice.
UPDATE "WorkoutExercise" we SET "targetSets" = e."targetSets" FROM "Exercise" e WHERE e."id" = we."exerciseId";

-- AlterTable
ALTER TABLE "WorkoutExercise" DROP COLUMN "sets",
DROP COLUMN "targetReps",
DROP COLUMN "targetWeight";

-- AlterTable
ALTER TABLE "WorkoutSet" DROP COLUMN "targetReps",
DROP COLUMN "targetWeight";

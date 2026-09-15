/*
  Warnings:

  - You are about to drop the column `targetReps` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetWeight` on the `Exercise` table. All the data in the column will be lost.
  - Added the required column `targetSets` to the `Exercise` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "targetReps",
DROP COLUMN "targetWeight",
ADD COLUMN     "targetSets" INTEGER NOT NULL;

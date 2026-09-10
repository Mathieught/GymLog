-- @auth/prisma-adapter calls prisma.account / prisma.session / prisma.verificationToken with
-- hard-coded names, so the Prisma models (and therefore these tables) must be named exactly
-- Account / Session / VerificationToken. Tables were empty (no successful sign-in yet), so a
-- plain rename is safe.

ALTER TABLE "AuthAccount" RENAME TO "Account";
ALTER TABLE "AuthSession" RENAME TO "Session";
ALTER TABLE "AuthVerificationToken" RENAME TO "VerificationToken";

ALTER TABLE "Account" RENAME CONSTRAINT "AuthAccount_pkey" TO "Account_pkey";
ALTER TABLE "Session" RENAME CONSTRAINT "AuthSession_pkey" TO "Session_pkey";
ALTER TABLE "Account" RENAME CONSTRAINT "AuthAccount_userId_fkey" TO "Account_userId_fkey";
ALTER TABLE "Session" RENAME CONSTRAINT "AuthSession_userId_fkey" TO "Session_userId_fkey";

ALTER INDEX "AuthAccount_provider_providerAccountId_key" RENAME TO "Account_provider_providerAccountId_key";
ALTER INDEX "AuthSession_sessionToken_key" RENAME TO "Session_sessionToken_key";
ALTER INDEX "AuthVerificationToken_token_key" RENAME TO "VerificationToken_token_key";
ALTER INDEX "AuthVerificationToken_identifier_token_key" RENAME TO "VerificationToken_identifier_token_key";

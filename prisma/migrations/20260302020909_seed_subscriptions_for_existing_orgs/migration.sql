-- Cria assinatura FREE para organizações que ainda não têm
INSERT INTO "Subscription" ("id", "organizationId", "plan", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'FREE', 'ACTIVE', NOW(), NOW()
FROM "Organization"
WHERE "id" NOT IN (SELECT "organizationId" FROM "Subscription");
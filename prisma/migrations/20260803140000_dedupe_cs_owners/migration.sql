-- Prefer real seed owners (@moonshot.local) over migration-generated
-- @cs.moonshot.local duplicates with the same display name.

-- Reassign product requests from migrated duplicate owners to the canonical one
UPDATE "ProductRequest" pr
SET "csOwnerId" = keep.id
FROM "CsOwner" dup
JOIN "CsOwner" keep
  ON lower(keep.name) = lower(dup.name)
 AND keep.email NOT LIKE '%@cs.moonshot.local'
 AND keep.id <> dup.id
WHERE pr."csOwnerId" = dup.id
  AND dup.email LIKE '%@cs.moonshot.local';

-- Delete unused migrated duplicates
DELETE FROM "CsOwner"
WHERE email LIKE '%@cs.moonshot.local'
  AND id NOT IN (
    SELECT DISTINCT "csOwnerId" FROM "ProductRequest" WHERE "csOwnerId" IS NOT NULL
  );

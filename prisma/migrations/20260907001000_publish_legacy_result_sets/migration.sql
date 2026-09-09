-- The prior portal treated every stored result set as public. Preserve that
-- behaviour for data upgraded before versioned publishing was introduced.
UPDATE "ResultSet"
SET "status" = 'PUBLISHED', "publishedAt" = "uploadedAt"
WHERE "status" = 'DRAFT' AND "version" = 1 AND "source" = 'UPLOAD';

# ECOTEMS Result Portal

An ND result-processing portal for a four-semester programme:

| Semester | Level |
| --- | --- |
| 1 | ND1 |
| 2 | ND1 |
| 3 | ND2 |
| 4 | ND2 |

Administrators can upload a broadsheet or paste a tab-separated table copied from Excel/Google Sheets. Every import is recalculated and validated on the server, saved as a private draft, reviewed, and explicitly published. Re-importing a semester creates a new version; it does not delete the previous one.

Students can use `/results` to view only published results and their cumulative GPA.

## Run locally

1. Copy `.env.example` to `.env.local` and provide a secure `SESSION_SECRET`, admin username, and bcrypt password hash.
2. Install packages with `npm install`.
3. Create/update the local database with `npm run db:migrate`.
4. Start the app with `npm run dev`.

The checked-in development configuration uses SQLite at `prisma/portal.db`. The local Prisma schema is [prisma/schema.prisma](prisma/schema.prisma). For Neon, use the PostgreSQL schema at [prisma/schema.postgresql.prisma](prisma/schema.postgresql.prisma), set `DATABASE_URL` to Neon’s pooled connection string, and run `npm run db:generate:neon` before building. Use `npm run db:push:neon` only for an initial empty database or a deliberate schema sync; production changes should use a reviewed PostgreSQL migration before accepting live records.

The generated Prisma client is provider-specific. After switching between local SQLite and Neon, regenerate with the matching command before starting or building the app. The two schema files intentionally share the same models so local development remains offline while production uses durable PostgreSQL storage.

## Pasting results

Copy a tab-separated grid with `Matric No`, `Name`, and course headings that include their unit:

```text
Matric No	Name	CSC 101 (3)	MTH 111 (3)
ECT25/COM/001	Ada Obi	A	BC
```

Accepted grades are `A`, `AB`, `B`, `BC`, `C`, `CD`, `D`, `E`, `F`, `ABS`, `NR`, or a numeric score from 0 to 100. GPA, total grade points, and remarks are calculated by the server.

## Result lifecycle

1. Save the reviewed import as a draft.
2. Review the department, course columns, student count, and grades in the Result Portal.
3. Publish the draft when it is correct.
4. If corrections are needed, create a new import. Publishing it archives the previous public version for that department, session, and semester.

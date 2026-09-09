-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ResultSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResultSet_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ResultSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "unit" INTEGER NOT NULL,
    "resultSetId" INTEGER NOT NULL,
    CONSTRAINT "Course_resultSetId_fkey" FOREIGN KEY ("resultSetId") REFERENCES "ResultSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricNo" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "resultSetId" INTEGER NOT NULL,
    "tgp" REAL NOT NULL,
    "tcu" INTEGER NOT NULL,
    "gpa" REAL NOT NULL,
    "remark" TEXT NOT NULL,
    CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Enrollment_resultSetId_fkey" FOREIGN KEY ("resultSetId") REFERENCES "ResultSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseGrade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enrollmentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "gradePoint" REAL NOT NULL,
    CONSTRAINT "CourseGrade_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseGrade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Session_label_key" ON "Session"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSet_departmentId_sessionId_level_semester_key" ON "ResultSet"("departmentId", "sessionId", "level", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "Student_matricNo_key" ON "Student"("matricNo");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_resultSetId_key" ON "Enrollment"("studentId", "resultSetId");

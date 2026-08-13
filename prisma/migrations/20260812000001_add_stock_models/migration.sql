-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appName" TEXT NOT NULL DEFAULT 'ALBA Finance',
    "appLogo" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- Insert default config
INSERT INTO "SystemConfig" ("id", "appName", "updatedAt") VALUES (1, 'ALBA Finance', CURRENT_TIMESTAMP);

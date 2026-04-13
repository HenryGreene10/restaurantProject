import { PrismaClient } from "../generated/client/index.js"

const prisma = new PrismaClient()

function parseDatabaseUrl(databaseUrl) {
  try {
    return new URL(databaseUrl)
  } catch {
    return null
  }
}

function assertSafeResetEnvironment() {
  const nodeEnv = process.env.NODE_ENV ?? ""
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to reset the database.")
  }

  if (nodeEnv === "production") {
    throw new Error("db:reset-seed is blocked when NODE_ENV=production.")
  }

  const parsed = parseDatabaseUrl(databaseUrl)
  if (!parsed) {
    throw new Error("DATABASE_URL must be a valid URL.")
  }

  const host = parsed.hostname.toLowerCase()
  const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase()
  const safeHosts = new Set(["localhost", "127.0.0.1", "db", "postgres"])
  const safeNamePattern = /(dev|test|local|sandbox|staging|preview)/

  const hostLooksSafe = safeHosts.has(host) || safeNamePattern.test(host)
  const dbLooksSafe = safeNamePattern.test(databaseName)

  if (!hostLooksSafe && !dbLooksSafe) {
    throw new Error(
      `Refusing to run db:reset-seed against DATABASE_URL host "${host}" and database "${databaseName}".`
    )
  }
}

async function listPublicTables() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename ASC
  `)

  return tables
    .map((row) => row.tablename)
    .filter((tableName) => typeof tableName === "string" && tableName.length > 0)
}

async function main() {
  assertSafeResetEnvironment()

  const tableNames = await listPublicTables()
  if (tableNames.length === 0) {
    console.log("No public tables found to truncate.")
    return
  }

  const qualifiedTables = tableNames
    .map((tableName) => `"public"."${tableName}"`)
    .join(", ")

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${qualifiedTables} RESTART IDENTITY CASCADE`)

  console.log(`Database reset complete. Truncated ${tableNames.length} tables and preserved schema/migrations.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error)
    await prisma.$disconnect()
    process.exit(1)
  })

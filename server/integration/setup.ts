import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { execSync } from "node:child_process";
import path from "node:path";

let container: StartedTestContainer | null = null;

export async function startTestDatabase(): Promise<{
  container: StartedTestContainer;
  connectionString: string;
}> {
  if (container) {
    const port = container.getMappedPort(3306);
    const host = container.getHost();
    return {
      container,
      connectionString: `mysql://test:test@${host}:${port}/sentinel_test`,
    };
  }

  container = await new GenericContainer("mysql:8.0")
    .withEnvironment({
      MYSQL_ROOT_PASSWORD: "rootpass",
      MYSQL_DATABASE: "sentinel_test",
      MYSQL_USER: "test",
      MYSQL_PASSWORD: "test",
    })
    .withExposedPorts(3306)
    .withCommand(["--default-authentication-plugin=mysql_native_password"])
    .start();

  const port = container.getMappedPort(3306);
  const host = container.getHost();
  const connectionString = `mysql://test:test@${host}:${port}/sentinel_test`;

  // Run migrations
  const rootDir = path.resolve(import.meta.dirname, "../..");
  execSync("drizzle-kit migrate", {
    cwd: rootDir,
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
    },
    stdio: "pipe",
  });

  return { container, connectionString };
}

export async function stopTestDatabase(): Promise<void> {
  if (container) {
    await container.stop();
    container = null;
  }
}

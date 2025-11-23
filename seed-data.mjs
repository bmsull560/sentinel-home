import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { vulnerabilities, actionPlans } from "./drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("Seeding database with sample data...");

// Sample vulnerabilities
const vulnerabilitiesData = [
  {
    cveId: "CVE-2024-1234",
    title: "Bluetooth Low Energy Authentication Bypass",
    description: "A vulnerability in Bluetooth Low Energy (BLE) implementation allows unauthorized access to smart locks and IoT devices through authentication bypass.",
    severity: "immediate_attention",
    affectedDevices: JSON.stringify(["smart_home", "iot"]),
    manufacturer: "Various",
    discoveredAt: new Date("2024-01-15"),
    patchAvailable: true,
    patchDetails: "Update firmware to version 3.2.1 or later. Most manufacturers have released patches.",
  },
  {
    cveId: "CVE-2024-5678",
    title: "Router DNS Hijacking Vulnerability",
    description: "Certain router models are vulnerable to DNS hijacking attacks that could redirect users to malicious websites.",
    severity: "action_recommended",
    affectedDevices: JSON.stringify(["router"]),
    manufacturer: "Multiple vendors",
    discoveredAt: new Date("2024-02-20"),
    patchAvailable: true,
    patchDetails: "Enable automatic firmware updates and verify DNS settings are using trusted servers.",
  },
  {
    cveId: "CVE-2024-9012",
    title: "Smart Camera Video Stream Exposure",
    description: "Some smart cameras inadvertently expose video streams through misconfigured cloud services.",
    severity: "action_recommended",
    affectedDevices: JSON.stringify(["smart_home"]),
    manufacturer: "Ring, Wyze",
    discoveredAt: new Date("2024-03-10"),
    patchAvailable: false,
    patchDetails: null,
  },
  {
    cveId: "CVE-2024-3456",
    title: "Mobile OS Security Update",
    description: "Critical security patches for mobile operating systems addressing multiple vulnerabilities.",
    severity: "be_aware",
    affectedDevices: JSON.stringify(["mobile"]),
    manufacturer: "Apple, Google",
    discoveredAt: new Date("2024-04-05"),
    patchAvailable: true,
    patchDetails: "Install the latest OS update through your device settings.",
  },
  {
    cveId: null,
    title: "Outdated Firmware Advisory",
    description: "General advisory for devices running firmware versions older than 6 months.",
    severity: "calm",
    affectedDevices: JSON.stringify(["smart_home", "iot", "router"]),
    manufacturer: "All",
    discoveredAt: new Date("2024-05-01"),
    patchAvailable: false,
    patchDetails: null,
  },
];

try {
  // Insert vulnerabilities
  for (const vuln of vulnerabilitiesData) {
    await db.insert(vulnerabilities).values(vuln);
  }

  console.log("✓ Seeded vulnerabilities");

  // Action plans
  const actionPlansData = [
    {
      vulnerabilityId: 1,
      title: "Update Smart Lock Firmware",
      steps: JSON.stringify([
        { step: 1, description: "Open your smart lock manufacturer's app" },
        { step: 2, description: "Navigate to Settings > Firmware Update" },
        { step: 3, description: "Download and install version 3.2.1 or later" },
        { step: 4, description: "Verify the update completed successfully" },
      ]),
      difficulty: "easy",
      estimatedTime: "10-15 minutes",
    },
    {
      vulnerabilityId: 2,
      title: "Secure Router DNS Settings",
      steps: JSON.stringify([
        { step: 1, description: "Log into your router admin panel" },
        { step: 2, description: "Navigate to DNS settings" },
        { step: 3, description: "Set DNS servers to trusted providers (e.g., 1.1.1.1, 8.8.8.8)" },
        { step: 4, description: "Enable automatic firmware updates" },
        { step: 5, description: "Change default admin password if not already done" },
      ]),
      difficulty: "moderate",
      estimatedTime: "20-30 minutes",
    },
  ];

  for (const plan of actionPlansData) {
    await db.insert(actionPlans).values(plan);
  }

  console.log("✓ Seeded action plans");
  console.log("\n✓ Database seeding completed successfully!");

} catch (error) {
  console.error("Error seeding database:", error);
  process.exit(1);
} finally {
  await connection.end();
}

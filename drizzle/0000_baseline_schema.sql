CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`logoUrl` text,
	`plan` enum('free','starter','pro','enterprise') NOT NULL DEFAULT 'free',
	`planSeats` int NOT NULL DEFAULT 3,
	`planDevices` int NOT NULL DEFAULT 10,
	`billingEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','viewer') NOT NULL DEFAULT 'viewer',
	`invitedBy` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','viewer') NOT NULL DEFAULT 'viewer',
	`token` varchar(128) NOT NULL,
	`invitedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` enum('smart_home','iot','mobile','laptop','router','automotive','health','child_pet','other') NOT NULL DEFAULT 'other',
	`manufacturer` varchar(100),
	`model` varchar(200),
	`firmwareVersion` varchar(50),
	`ipAddress` varchar(45),
	`macAddress` varchar(17),
	`status` enum('secure','at_risk','critical','unknown') NOT NULL DEFAULT 'unknown',
	`lastSeenAt` timestamp,
	`matchedCpeVendor` varchar(100),
	`matchedCpeProduct` varchar(200),
	`matchConfidence` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vulnerabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`deviceId` int,
	`cveId` varchar(30),
	`title` varchar(300) NOT NULL,
	`description` text,
	`plainDescription` text,
	`severity` enum('calm','be_aware','action_recommended','immediate_attention') NOT NULL DEFAULT 'calm',
	`cvssScore` varchar(5),
	`attackVector` varchar(50),
	`affectedFirmware` varchar(100),
	`patchAvailable` boolean NOT NULL DEFAULT false,
	`patchVersion` varchar(50),
	`isKev` boolean NOT NULL DEFAULT false,
	`exploitAvailable` boolean NOT NULL DEFAULT false,
	`status` enum('open','acknowledged','resolved','wont_fix') NOT NULL DEFAULT 'open',
	`aiExplanation` text,
	`actionSteps` json,
	`publishedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vulnerabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`deviceId` int,
	`vulnerabilityId` int,
	`title` varchar(300) NOT NULL,
	`message` text,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`status` enum('unread','read','acknowledged','dismissed') NOT NULL DEFAULT 'unread',
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`triggeredBy` int,
	`intent` text NOT NULL,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`agentTrace` json,
	`result` text,
	`tokensUsed` int,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nvd_cve_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cveId` varchar(30) NOT NULL,
	`cvssV3Score` varchar(5),
	`cvssV3Vector` varchar(100),
	`cvssV3Severity` varchar(20),
	`attackVector` varchar(20),
	`attackComplexity` varchar(20),
	`privilegesRequired` varchar(20),
	`userInteraction` varchar(20),
	`confidentialityImpact` varchar(20),
	`integrityImpact` varchar(20),
	`availabilityImpact` varchar(20),
	`description` text,
	`cpeMatches` json,
	`affectedVendors` json,
	`isKev` boolean NOT NULL DEFAULT false,
	`kevDateAdded` varchar(20),
	`kevDueDate` varchar(20),
	`kevKnownRansomwareUse` varchar(10),
	`kevRequiredAction` text,
	`exploitAvailable` boolean NOT NULL DEFAULT false,
	`patchAvailable` boolean NOT NULL DEFAULT false,
	`nvdPublishedAt` timestamp,
	`nvdLastModifiedAt` timestamp,
	`ingestedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nvd_cve_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `nvd_cve_cache_cveId_unique` UNIQUE(`cveId`)
);
--> statement-breakpoint
CREATE TABLE `kev_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cveId` varchar(30) NOT NULL,
	`vendorProject` varchar(200),
	`product` varchar(200),
	`vulnerabilityName` varchar(300),
	`dateAdded` varchar(20),
	`shortDescription` text,
	`requiredAction` text,
	`dueDate` varchar(20),
	`knownRansomwareCampaignUse` varchar(10),
	`notes` text,
	`ingestedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kev_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `kev_catalog_cveId_unique` UNIQUE(`cveId`)
);
--> statement-breakpoint
CREATE TABLE `device_cve_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`orgId` int NOT NULL,
	`cveId` varchar(30) NOT NULL,
	`matchStrategy` enum('exact_cpe','fuzzy_cpe','fingerprint','vendor_product') NOT NULL,
	`confidenceScore` int NOT NULL,
	`sentinelRiskScore` int NOT NULL,
	`cvssScore` varchar(5),
	`isKev` boolean NOT NULL DEFAULT false,
	`exploitAvailable` boolean NOT NULL DEFAULT false,
	`patchAvailable` boolean NOT NULL DEFAULT false,
	`alertGenerated` boolean NOT NULL DEFAULT false,
	`alertId` int,
	`vulnerabilityId` int,
	`matchedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `device_cve_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` enum('nvd','cisa_kev','full_sync') NOT NULL,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`cvesFetched` int NOT NULL DEFAULT 0,
	`cvesInserted` int NOT NULL DEFAULT 0,
	`cvesUpdated` int NOT NULL DEFAULT 0,
	`matchesCreated` int NOT NULL DEFAULT 0,
	`alertsGenerated` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `ingestion_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`openId` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);

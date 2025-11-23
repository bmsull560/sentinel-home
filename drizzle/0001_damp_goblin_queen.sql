CREATE TABLE `actionPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vulnerabilityId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`steps` text NOT NULL,
	`difficulty` enum('easy','moderate','advanced') NOT NULL,
	`estimatedTime` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actionPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` int,
	`vulnerabilityId` int NOT NULL,
	`status` enum('new','acknowledged','resolved','dismissed') NOT NULL DEFAULT 'new',
	`actionTaken` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('smart_home','iot','mobile','laptop','router','automotive','health','child_pet') NOT NULL,
	`manufacturer` varchar(255),
	`model` varchar(255),
	`firmwareVersion` varchar(100),
	`status` enum('secure','at_risk','unknown') NOT NULL DEFAULT 'unknown',
	`lastChecked` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','warning','action_required','resolved') NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`relatedAlertId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vulnerabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cveId` varchar(50),
	`title` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`severity` enum('calm','be_aware','action_recommended','immediate_attention') NOT NULL,
	`affectedDevices` text,
	`manufacturer` varchar(255),
	`discoveredAt` timestamp NOT NULL,
	`patchAvailable` boolean NOT NULL DEFAULT false,
	`patchDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vulnerabilities_id` PRIMARY KEY(`id`)
);

import { localDashboardRepository } from "./localDashboardRepository";
import type { DashboardRepository } from "./dashboardRepository";

/**
 * The only place that decides which implementation the app runs against.
 * Swapping in an ApiDashboardRepository (GET /dashboard/:profileId) is a
 * one-line change here — no hook or component knows the difference.
 */
export const dashboardRepository: DashboardRepository = localDashboardRepository;

export type { DashboardRepository } from "./dashboardRepository";

import { localEndeavourRepository } from "./endeavourRepository";
import type { EndeavourRepository } from "./endeavourRepository";

/**
 * The only place that decides which implementation the app runs against.
 * Swapping in an ApiEndeavourRepository (GET /api/endeavour/world) is a
 * one-line change here — no hook or component knows the difference.
 */
export const endeavourRepository: EndeavourRepository = localEndeavourRepository;

export type { EndeavourRepository } from "./endeavourRepository";

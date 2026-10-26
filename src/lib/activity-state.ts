import type { PlanActivity, PlanDay } from "./types";
import { mergeDayActivities } from "./planner/budget";

function identify(activities: PlanActivity[], day: number, scope: string): PlanActivity[] {
  const counts = new Map<string, number>();
  return activities.map((activity) => {
    const identity = JSON.stringify([activity.kind, activity.title, activity.lat ?? null, activity.lon ?? null, activity.mealSlot ?? null]);
    const occurrence = counts.get(identity) || 0;
    counts.set(identity, occurrence + 1);
    return activity.id ? activity : { ...activity, id: scope + ":" + day + ":" + identity + ":" + occurrence };
  });
}
export function identifyDays(days: PlanDay[]): PlanDay[] {
  return days.map((day) => ({ ...day, activities: identify(day.activities, day.day, "base") }));
}
export function activityCheckKey(day: number, activity: PlanActivity): string {
  return "act:" + day + ":" + activity.id;
}
export function restoreActivityState(days: PlanDay[], custom: Record<number, PlanActivity[]>, checked: Record<string, boolean>) {
  const identifiedDays = identifyDays(days);
  const identifiedCustom = Object.fromEntries(Object.entries(custom).map(([day, activities]) => [day, identify(activities, Number(day), "custom")]));
  const result = { ...checked };
  for (const day of identifiedDays) {
    const activities = mergeDayActivities(day.activities, identifiedCustom[day.day]);
    activities.forEach((activity, index) => {
      const legacyKey = day.day + "-" + index + "-" + activity.title;
      const key = activityCheckKey(day.day, activity);
      if (!Object.hasOwn(result, key) && Object.hasOwn(checked, legacyKey)) result[key] = checked[legacyKey];
    });
  }
  return { days: identifiedDays, custom: identifiedCustom, checked: result };
}

/** Keep optimized custom stops separate so changing a flight/hotel cannot erase user additions. */
export function partitionOptimizedActivities(activities: PlanActivity[], custom: PlanActivity[]) {
  const customIds = new Set(custom.map((activity) => activity.id).filter((id): id is string => typeof id === "string"));
  return {
    base: activities.filter((activity) => !activity.id || !customIds.has(activity.id)),
    custom: custom.map((activity) => activities.find((updated) => !!activity.id && updated.id === activity.id) || activity),
  };
}

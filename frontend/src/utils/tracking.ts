// Convert backend tracking event type into a friendly Hebrew label.
export const formatEventType = (eventType: string): string => {
  if (eventType === "undo") {
    return "ביטול";
  }
  if (eventType === "correction") {
    return "תיקון";
  }
  return "עדכון מיקום";
};

// Convert backend transition source into a friendly Hebrew label.
export const formatTransitionSource = (source?: string): string => {
  const normalized = String(source || "")
    .trim()
    .toLowerCase();
  if (normalized === "bot") {
    return "הזנה עצמית (בוט)";
  }
  return "UI";
};

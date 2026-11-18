export function profileNameForEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized === "denisb@webwag.com") return "Denis";
  const firstName = normalized.split("@")[0].split(".")[0] || "Webwag";
  return firstName.replace(/^./, letter => letter.toUpperCase());
}

export function validateSkillFrontmatter(input: {
  name: string;
  description: string;
}): void {
  const name = input.name?.trim();
  const desc = input.description?.trim();

  if (!name) throw new Error("SKILL.md frontmatter missing required field: name");
  if (!desc) throw new Error("SKILL.md frontmatter missing required field: description");

  if (name.length < 1 || name.length > 64) throw new Error("name must be 1-64 chars");
  if (desc.length < 1 || desc.length > 1024) throw new Error("description must be 1-1024 chars");

  // a-z 0-9 hyphen；不以 hyphen 开头结尾；无连续 --
  const basic = /^[a-z0-9-]+$/.test(name);
  if (!basic) throw new Error("name must contain only lowercase letters, numbers, and hyphens");

  if (name.startsWith("-") || name.endsWith("-")) throw new Error("name must not start/end with hyphen");
  if (name.includes("--")) throw new Error("name must not contain consecutive hyphens");
}
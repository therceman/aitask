export function rejectCommand(_id: string | undefined): void {
  console.error("Error: reject is removed. Use: aitask rework <id> --reason '<reason>'");
  process.exit(1);
}

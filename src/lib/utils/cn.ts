// cn.ts

type ClassValue =
  | string
  | null
  | undefined
  | false
  | { [key: string]: boolean };

function cn(...args: ClassValue[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      if (typeof arg === "object" && arg !== null) {
        return Object.keys(arg)
          .filter((key) => arg[key])
          .join(" ");
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

export default cn;

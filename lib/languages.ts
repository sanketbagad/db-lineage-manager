export const LANGUAGE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; extensions: string[] }
> = {
  go: {
    label: "Go",
    color: "#00ADD8",
    bgColor: "rgba(0, 173, 216, 0.15)",
    borderColor: "rgba(0, 173, 216, 0.4)",
    extensions: [".go"],
  },
  javascript: {
    label: "JavaScript",
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    extensions: [".js", ".mjs", ".cjs"],
  },
  typescript: {
    label: "TypeScript",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.4)",
    extensions: [".ts", ".tsx"],
  },
  java: {
    label: "Java",
    color: "#F97316",
    bgColor: "rgba(249, 115, 22, 0.15)",
    borderColor: "rgba(249, 115, 22, 0.4)",
    extensions: [".java"],
  },
  python: {
    label: "Python",
    color: "#EAB308",
    bgColor: "rgba(234, 179, 8, 0.15)",
    borderColor: "rgba(234, 179, 8, 0.4)",
    extensions: [".py"],
  },
  ruby: {
    label: "Ruby",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    extensions: [".rb"],
  },
  rust: {
    label: "Rust",
    color: "#A855F7",
    bgColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.4)",
    extensions: [".rs"],
  },
  csharp: {
    label: "C#",
    color: "#EC4899",
    bgColor: "rgba(236, 72, 153, 0.15)",
    borderColor: "rgba(236, 72, 153, 0.4)",
    extensions: [".cs"],
  },
  sql: {
    label: "SQL",
    color: "#94A3B8",
    bgColor: "rgba(148, 163, 184, 0.15)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    extensions: [".sql"],
  },
  prisma: {
    label: "Prisma",
    color: "#2D3748",
    bgColor: "rgba(45, 55, 72, 0.15)",
    borderColor: "rgba(45, 55, 72, 0.4)",
    extensions: [".prisma"],
  },
  graphql: {
    label: "GraphQL",
    color: "#E535AB",
    bgColor: "rgba(229, 53, 171, 0.15)",
    borderColor: "rgba(229, 53, 171, 0.4)",
    extensions: [".graphql", ".gql"],
  },
  proto: {
    label: "Protobuf",
    color: "#4285F4",
    bgColor: "rgba(66, 133, 244, 0.15)",
    borderColor: "rgba(66, 133, 244, 0.4)",
    extensions: [".proto"],
  },
  unknown: {
    label: "Other",
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.15)",
    borderColor: "rgba(107, 114, 128, 0.4)",
    extensions: [],
  },
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase()
  for (const [lang, config] of Object.entries(LANGUAGE_CONFIG)) {
    if (config.extensions.includes(ext)) return lang
  }
  return "unknown"
}

export function getLanguageConfig(language: string) {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.unknown
}

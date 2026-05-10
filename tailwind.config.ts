import type { Config } from "tailwindcss";

import { hairlineBorderPlugin } from "./tailwind-hairline-plugin";

const config: Config = {
  safelist: [
    {
      pattern:
        /^text-(heading-screen|heading-page|heading-section|heading-card|body|caption|micro)$/,
    },
  ],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /** 極細框 — coarse 時改 1px 見 tailwind-hairline-plugin.ts */
      borderWidth: {
        hairline: "0.5px",
      },
      fontSize: {
        /** 螢幕頂主標（PageHeading）— docs/09-ui-design.md */
        "heading-screen": ["22px", { lineHeight: "1.2", fontWeight: "500" }],
        /** 數字大值等 — docs/09-ui-design.md */
        "heading-page": ["20px", { lineHeight: "1.25", fontWeight: "500" }],
        /** 區塊標題 */
        "heading-section": ["15px", { lineHeight: "1.3", fontWeight: "500" }],
        /** 卡片小標 */
        "heading-card": ["13px", { lineHeight: "1.35", fontWeight: "500" }],
        /** 內文（字重預設繼承 body font-normal，按鈕等另加 font-medium） */
        body: ["13px", { lineHeight: "1.45" }],
        /** 輔助文字 */
        caption: ["12px", { lineHeight: "1.4" }],
        /** nav 標籤、角標 */
        micro: ["11px", { lineHeight: "1.35" }],
      },
      ringColor: {
        DEFAULT: "#4C956C",
      },
      colors: {
        neutral: {
          bg: {
            primary: "var(--color-background-primary)",
            secondary: "var(--color-background-secondary)",
            tertiary: "var(--color-background-tertiary)",
          },
          text: {
            primary: "var(--color-text-primary)",
            secondary: "var(--color-text-secondary)",
            tertiary: "var(--color-text-tertiary)",
          },
          border: {
            secondary: "var(--color-border-secondary)",
            tertiary: "var(--color-border-tertiary)",
          },
        },
        border: "hsl(var(--border))",
        /** 儀表板卡路里圓環底軌 — 對應 globals `--calorie-ring-track` */
        "calorie-ring-track": "hsl(var(--calorie-ring-track))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          opaque: "hsl(var(--card-opaque))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          light: "hsl(var(--primary-light-panel))",
          foreground: "var(--primary-text)",
        },
        steel: {
          panel: "hsl(var(--steel-panel))",
          border: "hsl(var(--steel-border))",
          foreground: "var(--steel-text)",
          accent: "var(--steel-accent)",
          hover: "hsl(var(--steel-panel-hover))",
        },
        "shadow-grey": {
          DEFAULT: "var(--shadow-grey)",
          hover: "var(--shadow-grey-hover)",
        },
        surface: {
          secondary: "var(--surface-secondary)",
        },
      },
    },
  },
  plugins: [hairlineBorderPlugin],
};

export default config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#E8E6E1",
        input: "#E8E6E1",
        ring: "#E05D36",
        background: "#FDFBF7",
        foreground: "#1A1F16",
        primary: {
          DEFAULT: "#E05D36",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#4A6B53",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#D34E4E",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F3EC",
          foreground: "#5C6656",
        },
        accent: {
          DEFAULT: "#F5F3EC",
          foreground: "#1A1F16",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1F16",
        },
        success: "#4A6B53",
        warning: "#F2A65A",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        heading: ['Cabinet Grotesk', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

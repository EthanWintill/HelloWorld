/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        gg: {
          bg: "#f4fcf0",
          surface: "#ffffff",
          surfaceLow: "#eff6ea",
          surfaceContainer: "#e9f0e5",
          surfaceHigh: "#e3eadf",
          surfaceHighest: "#dde5d9",
          text: "#171d16",
          muted: "#3e4a3d",
          outline: "#6e7b6c",
          outlineVariant: "#bdcaba",
          primary: "#006b2c",
          primaryContainer: "#00873a",
          primaryFixed: "#7ffc97",
          secondary: "#0051d5",
          error: "#ba1a1a",
          errorContainer: "#ffdad6",
          tertiary: "#a72d51",
        },
        primary: "#161622",
        secondary: {
          DEFAULT: "#FF9C01",
          100: "#FF9001",
          200: "#FF8E01",
        },
        black: {
          DEFAULT: "#000",
          100: "#1E1E2D",
          200: "#232533",
        },
        gray: {
          100: "#CDCDE0",
        },
      },
      fontFamily: {
        pthin: ["Poppins-Thin", "sans-serif"],
        pextralight: ["Poppins-ExtraLight", "sans-serif"],
        plight: ["Poppins-Light", "sans-serif"],
        pregular: ["Poppins-Regular", "sans-serif"],
        pmedium: ["Poppins-Medium", "sans-serif"],
        psemibold: ["Poppins-SemiBold", "sans-serif"],
        pbold: ["Poppins-Bold", "sans-serif"],
        pextrabold: ["Poppins-ExtraBold", "sans-serif"],
        pblack: ["Poppins-Black", "sans-serif"],
      },
    },
  },
  plugins: [],
}

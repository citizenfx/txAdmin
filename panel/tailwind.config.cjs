/* eslint-disable */
const { fontFamily } = require("tailwindcss/defaultTheme");
const colors = require('tailwindcss/colors');


/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      typography: {
        toast: {
          css: [
            {
              '--tw-prose-body': colors.zinc[800],
              '--tw-prose-invert-body': colors.zinc[200],
              '--tw-prose-bullets': colors.zinc[600],
              '--tw-prose-invert-bullets': colors.zinc[400],
              a: {
                letterSpacing: '0.025em',
                fontWeight: '700',
              },
              p: {
                marginTop: '0.571em',
                marginBottom: '0.571em',
              },
              ul: {
                marginTop: '0.571em',
                marginBottom: '0.571em',
              },
            },
            {
              '> :first-child': {
                marginTop: '0',
              },
              '> :last-child': {
                marginBottom: '0',
              },
            },
          ],
        },
      },
      fontSize: {
        '2xs': '0.625rem', // 10px
      },
      spacing: {
        navbarvh: "var(--navbar-vh)", //navbar height (including border)
        contentoffset: "var(--content-offset)", // screen - navbar - pt
        contentvh: "var(--content-vh)", // screen - navbar - pt - pb
        sidebar: "16rem", //256px
      },
      screens: {
        xs: "480px",
        "2xl": "1400px",
        "3xl": "1600px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      colors: {
        discord: {
          DEFAULT: "#5865F2",
          active: "#7289DA"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          hint: "hsl(var(--destructive-hint))",
          inline: "hsl(var(--destructive-inline))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          hint: "hsl(var(--warning-hint))",
          inline: "hsl(var(--warning-inline))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          hint: "hsl(var(--success-hint))",
          inline: "hsl(var(--success-inline))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          hint: "hsl(var(--info-hint))",
          inline: "hsl(var(--info-inline))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        //Animation for the accordion - default from shadcn
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },

        //Animation for the toastbar copied from react-hot-toast, except for the icon animation
        //https://github.com/timolins/react-hot-toast/blob/main/site/tailwind.config.js
        "toastbar-icon": {
          '0%': { transform: 'scale(0.5)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        "toastbar-enter": {
          '0%': { transform: 'scale(0.9)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        "toastbar-leave": {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(0.9)', opacity: 0 },
        },
        //NOTE: added these while testing stuff, never used, idk if they work
        // "fade-left": {
        //   "0%": { transform: "translateX(2rem)", opacity: "0" },
        //   "100%": { transform: "translateX(0)", opacity: "1" }
        // },
        // "fade-down": {
        //   "0%": { transform: "translateY(-2rem)", opacity: "0" },
        //   "100%": { transform: "translateY(0)", opacity: "1" }
        // },
        // "fade-right": {
        //   "0%": { transform: "translateX(-2rem)", opacity: "0" },
        //   "100%": { transform: "translateX(0)", opacity: "1" }
        // },
        // "fade-right-out": {
        //   "0%": { transform: "translateX(0)", opacity: "1" },
        //   "100%": { transform: "translateX(2rem)", opacity: "0" }
        // },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "toastbar-icon": 'toastbar-icon 350ms ease-out',
        "toastbar-enter": 'toastbar-enter 200ms ease-out',
        "toastbar-leave": 'toastbar-leave 150ms ease-in forwards',
        //NOTE: added these while testing stuff, never used, idk if they work
        // "fade-left": "fade-left 0.2s ease",
        // "fade-down": "fade-down 0.2s ease",
        // "fade-right": "fade-right 0.2s ease forwards",
        // "fade-right-out": "fade-right-out 0.2s ease forwards",
      },
    },
  },
  safelist: [
    'text-yellow-600', //server status - temp schedule - light mode  
  ],
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography'),
  ],
};

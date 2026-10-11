/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        buddhist: {
          light: '#fef3c7',
          DEFAULT: '#d97706',
          dark: '#92400e',
          bubble: '#fffbeb',
          border: '#fde68a',
        },
        kantian: {
          light: '#e0e7ff',
          DEFAULT: '#4f46e5',
          dark: '#3730a3',
          bubble: '#eef2ff',
          border: '#c7d2fe',
        },
        confucian: {
          light: '#dcfce7',
          DEFAULT: '#15803d',
          dark: '#166534',
          bubble: '#f0fdf4',
          border: '#bbf7d0',
        },
        utilitarian: {
          light: '#f3e8ff',
          DEFAULT: '#7c3aed',
          dark: '#5b21b6',
          bubble: '#faf5ff',
          border: '#e9d5ff',
        },
      },
    },
  },
  plugins: [],
};

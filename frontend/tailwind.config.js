/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HoneyChain Brand Palette
        'espresso': '#171210',      // Deep charcoal base
        'surface': '#241B14',        // Warm surface
        'honey': '#E3A530',          // Gold primary accent
        'amber': '#B6651D',          // Deep amber secondary
        'cream': '#F3E9D2',          // Cream text
        'sage': '#7C9473',           // Muted sage (healthy states)
        'brick': '#B4523A',          // Muted brick (alerts)
      },
      fontFamily: {
        'serif': ['Fraunces', 'serif'],
        'sans': ['Inter', 'Public Sans', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        'hex-sm': '0.25rem',
        'hex-md': '0.5rem',
        'hex-lg': '1rem',
      },
    },
  },
  plugins: [],
}

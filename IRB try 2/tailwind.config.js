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
        // Mount Sinai Official Brand Colors
        brand: {
          primary: '#06ABEB',      // Vivid Cerulean - Primary CTAs, links
          'primary-hover': '#0891C7',
          accent: '#DC298D',        // Barbie Pink - Secondary CTAs, highlights
          heading: '#212070',       // St. Patrick's Blue - Headers, navigation
          navy: '#00002D',          // Cetacean Blue - Text, high contrast
        },
        // Status Colors
        status: {
          success: '#10B981',       // Green - Approvals, completed
          warning: '#F59E0B',       // Amber - Pending, cautions
          error: '#EF4444',         // Red - Rejections, critical
          info: '#06ABEB',          // Blue - Informational
        },
        // Semantic Status Colors
        semantic: {
          'draft-bg': '#F3F4F6',
          'draft-text': '#1F2937',
          'pending-bg': '#FEF3C7',
          'pending-text': '#92400E',
          'approved-bg': '#D1FAE5',
          'approved-text': '#065F46',
          'active-bg': '#DBEAFE',
          'active-text': '#1E40AF',
          'rejected-bg': '#FEE2E2',
          'rejected-text': '#991B1B',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display': ['60px', { lineHeight: '72px', fontWeight: '700' }],
        'h1': ['36px', { lineHeight: '44px', fontWeight: '700' }],
        'h2': ['30px', { lineHeight: '38px', fontWeight: '600' }],
        'h3': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'h4': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-large': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'overline': ['11px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.5px' }],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
        'lg': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
        'xl': '0 8px 24px 0 rgba(0, 0, 0, 0.15)',
        '2xl': '0 16px 48px 0 rgba(0, 0, 0, 0.2)',
        'focus': '0 0 0 3px rgba(6, 171, 235, 0.1)',
      },
    },
  },
  plugins: [],
}
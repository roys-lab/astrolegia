/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
        // Componentes compartidos del Design System (@astrolegia/ui): sus
        // clases Tailwind se generan con la config de ESTA app.
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cosmic Luxury tokens (defined in src/app/globals.css as
                // "R G B" channel triplets) — rgb(var(--x-rgb) / <alpha-value>)
                // keeps opacity modifiers like bg-accent-primary/50 working.
                'accent-primary': 'rgb(var(--accent-primary-rgb) / <alpha-value>)',
                'accent-secondary': 'rgb(var(--accent-secondary-rgb) / <alpha-value>)',
                'accent-tertiary': 'rgb(var(--accent-tertiary-rgb) / <alpha-value>)',
                'accent-gold': 'rgb(var(--accent-gold-rgb) / <alpha-value>)',
                'accent-danger': 'rgb(var(--accent-danger-rgb) / <alpha-value>)',
                'bg-deep': 'rgb(var(--bg-deep-rgb) / <alpha-value>)',
                'bg-nebula': 'rgb(var(--bg-nebula-rgb) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['var(--font-main)'],
                heading: ['var(--font-heading)'],
                'dna-heading': ['var(--font-dna-heading)'],
                'dna-body': ['var(--font-dna-body)'],
            },
        },
    },
    plugins: [],
}

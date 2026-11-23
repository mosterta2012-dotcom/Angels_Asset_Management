import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' lets the same build run on Vercel, Netlify or GitHub Pages
export default defineConfig({ plugins: [react()], base: './' })

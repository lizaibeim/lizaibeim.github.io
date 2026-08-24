# Zaibei Li - Personal Portfolio

Welcome to the source code of my personal portfolio website. 

I am a Doctoral Researcher at the University of Copenhagen, specializing in Multimodal Learning Analytics (MMLA). My research bridges educational data mining, human-AI collaboration, and ubiquitous computing.

## Tech Stack
- React 19
- Vite
- Tailwind CSS
- Motion (`motion/react`, for animations)

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Ask-me-anything assistant

The site has a chat box that answers questions about my research, projects, and background. It talks to a small Cloudflare Worker (`worker/`) that proxies Alibaba Cloud's Qwen models, so no API key ever reaches the browser.

Deployment steps are in [`worker/README.md`](worker/README.md).

## License
© 2026 Zaibei Li. All rights reserved.

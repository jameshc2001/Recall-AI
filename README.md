# Recall AI

A minimal flashcard generator powered by Claude. Describe a topic and Claude will ask a few clarifying questions before generating a custom deck. Practice with a flip-card interface and track your score.

## Features

- **AI deck generation** — conversational flow where Claude asks about topic, difficulty, and card count before generating
- **Practice mode** — flip cards to reveal answers, mark yourself correct or incorrect, see your score at the end
- **Deck management** — save, view, and delete decks; everything persists in localStorage

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)

## Local setup

**1. Clone the repo and install dependencies**

```bash
npm install
```

**2. Add your Anthropic API key**

Create a `.env.local` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

You can get an API key from [console.anthropic.com](https://console.anthropic.com).

**3. Start the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

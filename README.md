This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Install
Step 1: https://clerk.com/
Step 2: https://wxflows.ibm.stepzen.com/docs/node-cli/build-tools (https://developer.ibm.com/tutorials/awb-build-tool-calling-agents-with-langgraph-and-flows-engine/?_gl=1*1n9qnl2*_ga*MTU1ODEzNzYzLjE3NDMzMTg2Njg.*_ga_FYECCCS21D*MTc0MzMxODY2Ny4xLjEuMTc0MzMxOTE3Mi4wLjAuMA..)
Step 2.2: wxflows login -e xxx --adminkey xxx
Step 3: npm install @clerk/nextjs
Step 4: set up convex (https://www.convex.dev/) npm install convex
Step 4.5: set up convex auth clerk (https://docs.convex.dev/auth/clerk)
Step 5: create folder convex (npx convex dev)
Step 6 setup authen (https://dashboard.clerk.com/apps/app_2ui4feI8O1d2rwlUlJGUlBeakOZ/instances/ins_2ui4fkPJDiNKPE9xiV5fhjvqlWo/jwt-templates)
Step 7: click Config => jwt-template => convex => save => copy link issue
Step 8: create file auth.config.ts in convex folder
Step 9: https://dashboard.convex.dev/t/dvphuc96/ai-agent-nextjs-be79f/capable-crab-318/settings/environment-variables
Step 10: npm install @clerk/clerk-react
Step 11: npx shadcn@latest init
Step 12: npx shadcn@latest add button
Step 13: setup multi-factor: (https://dashboard.clerk.com/apps/app_2ui4feI8O1d2rwlUlJGUlBeakOZ/instances/ins_2ui4fkPJDiNKPE9xiV5fhjvqlWo/user-authentication/multi-factor)
Step 14: npm i radix-ui, npm i @radix-ui/react-icons
Step 15: npm i langchain @langchain/core @langchain/anthropic @langchain/langgraph
Step 16: npm i @wxflows/sdk@beta
Step 17: create folder wxflows => cd wxflows (https://github.com/IBM/wxflows)
Step 18: wxflows init
Step 19: wxflows import tool https://raw.githubusercontent.com/IBM/wxflows/refs/heads/main/tools/wikipedia.zip
Step 20: wxflows import tool https://raw.githubusercontent.com/IBM/wxflows/refs/heads/main/tools/google_books.zip
Step 21: wxflows import curl https://dummyjson.com/comments
Step 22: wxflows import curl https://introspection.apis.stepzen.com/customers
Step 23: wxflows import tool https://raw.githubusercontent.com/IBM/wxflows/refs/heads/main/tools/youtube_transcript.zip
Step 24: wxflows deploy
Step 25: setting prompt cache (https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
Step 26: npx shadcn@latest add avatar

# SV Elétrica Dashboard - Developer Guidelines

## Commands
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint static code analysis
- `npm run lint:fix` - Automatically fix ESLint issues

## Code Style Guidelines
- **Imports**: Group by 1) React/Next, 2) UI components, 3) utilities, 4) types, 5) assets
- **Formatting**: Use TypeScript with strict typing; prefix unused variables with underscore
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **Components**: Function components with hooks; group state at top, effects in middle, handlers before return
- **Error Handling**: Use try/catch in API routes with NextResponse; provide meaningful error messages
- **API Routes**: Always validate inputs, sanitize outputs, return consistent JSON structure with status codes
- **Authentication**: Use Supabase with createAdminClient() for server routes; never expose service key
- **UI Components**: Use ShadCN UI components with cn() utility for className composition
- **Data Fetching**: Use SWR for client-side data fetching with proper error handling
- **Images**: Use Next.js Image component with proper sizing; configure remotePatterns in next.config.mjs

Always test on mobile and desktop viewports, prioritize accessibility, and follow React 18+ best practices.
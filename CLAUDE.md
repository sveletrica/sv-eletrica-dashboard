# SV Elétrica Dashboard - Developer Guidelines

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint static code analysis
- `npm run lint:fix` - Automatically fix ESLint issues

## Code Style Guidelines
- **Imports**: Group by 1) React/Next, 2) UI components, 3) utilities, 4) types, 5) assets
- **Formatting**: Use TypeScript with strict typing; prefix unused variables with underscore
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **Component Structure**: Group state at top, effects in middle, handlers/helpers before return
- **Error Handling**: Use try/catch in API routes with NextResponse for error returns
- **File Structure**: Group by feature in app directory, common components in components/
- **API Routes**: Validate inputs and sanitize outputs, return JSON with appropriate status codes
- **Authentication**: Use Supabase auth in API routes with cookie-based sessions
- **Performance**: Use SWR for data fetching, React.memo for expensive renders
- **CSS**: Use Tailwind with className composition via cn() utility

Always validate user inputs, handle asynchronous operations properly, and maintain consistent error handling patterns across API routes.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# # AGENTS.md

Operation manual for AI agents in this Fullstack repository (Next.js/Node.js/SQL).

## Supreme Directive: Strict TDD (Test-Driven Development)

You must follow the Red-Green-Refactor cycle for **any** code change or feature creation.

1. **Red:** Write the automated test first. Run it and ensure it fails for the correct reason.
2. **Green:** Write the minimum amount of code necessary to make the test pass.
3. **Refactor:** Clean up the code, remove duplication, and improve design while ensuring tests remain green.

---

## Grill-Me Protocol (Active Challenge)

Before writing any code or architecting a complex solution, you must **interrogate and challenge** the human developer's assumptions. Do not act as a passive executor.

- **Question Requirements:**

1. **Ask hard questions** about design decisions, edge cases, and hidden dependencies.
2. **Ask only one or two** questions at a time so you do not overwhelm me.
3. **For each question** you ask, provide a realistic [Recommended Answer]. If I agree with it, I can simply reply "yes" or "move forward" to accept it.
4. **If the answer** to a question can be deduced from the context or project files (if applicable), look for it yourself instead of asking me.
5. **Do not be overly polite or formal**; focus purely on finding technical flaws and aligning the specification.

- **Challenge Design:** If the proposed solution violates best practices (such as SOLID, DRY, or SQL performance), point out the risks and propose a superior alternative.
- **Test Validation:** Clarify exactly _what_ needs to be tested (and how to mock complex behaviors) before creating the initial test file.
- **Operational Flow:** Whenever you receive a major task, reply with 2 to 3 hard questions to align critical business scenarios before moving to the "Red" step of TDD.

---

## Operational Commands

### Frontend (Next.js / React)

- **Run Tests:** `[npm run test:frontend]` or `[npm run test:watch]`
- **Build / Lint:** `[npm run build:frontend]` / `[npm run lint]`
- **Component CLI:** Use `npx shadcn@latest add [component-name]` when adding new UI components.
- **Styling:** Use **Tailwind CSS**. Stick to native utility classes. Do not create arbitrary CSS files or inline styles outside of Tailwind.

### Backend (Node.js + SQL)

- **Run Tests (API/Integration):** `[npm run test:backend]`
- **SQL Migrations:** `[npm run db:migrate]` to update the local database before running tests.
- **Rollback:** `[npm run db:rollback]` to revert schema changes if needed.

---

## Architecture & Code Standards

### Frontend (Next.js & Tailwind)

- Use **App Router** (if applicable) and functional components with TypeScript.
- **UI Components:** Always prioritize using **shadcn/ui** components whenever possible. Check if the required component already exists in `@/components/ui/` or can be added via the shadcn CLI before building a custom UI element from scratch. Customize them using Tailwind utility classes.
- **Server Components (RSC) by Default:** Only add `'use client'` if direct interactivity (hooks, event listeners) is required.
- **Tailwind:** Follow the standard Tailwind class order (or use the corresponding Prettier plugin). Ensure responsive design using native prefixes (`sm:`, `md:`, `lg:`).

### Backend (Node.js & SQL)

- Explicitly decouple layers: **Routes/Controllers**, **Services (Business Logic)**, and **Repositories/Data Access (SQL)**.
- **SQL Security:** Never concatenate strings in queries. Use parameterized queries or the project's query builder/ORM (`[Prisma / Knex / Sequelize]`) to prevent SQL Injection.
- **Integration Tests:** API route tests must run against an isolated test database. Always clear/reset the database state before each test suite execution.

---

## Definition of Done (DoD)

1. Code is fully driven by tests (TDD) with adequate coverage.
2. Frontend and backend tests pass 100% without breaking existing features.
3. Next.js production build executes with zero linting or TypeScript errors.
4. Required SQL migrations are written, executed, and tested.
5. Clean code: no `console.log`, redundant comments, or orphan files.

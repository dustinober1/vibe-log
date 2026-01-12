## Project Plan: `log-vibe`

**Mission:** To make debugging a beautiful, intuitive, and contextual experience for every developer.

**Core Values:**
*   **Aesthetic First:** It must look and feel good.
*   **Zero-Friction:** It should work out of the box.
*   **Focused:** Do one thing and do it exceptionally well.
*   **Community-Driven:** Build with and for the community.

---

### Phase 0: Foundation & Strategy (Duration: 1 Day)

This phase is about setting the stage before any code is written.

**1. Finalize Naming & Branding:**
*   **Name:** `log-vibe` (Perfect. Keep it.)
*   **Tagline:** *Beautiful, simple, contextual logging for the modern developer.*
*   **Brand Identity:**
    *   **Logo:** A simple, clean text-based logo with a subtle gradient or a single, stylized icon (e.g., a tilde `~` or a sparkle `✨`).
    *   **Colors:** Define a primary color palette for the README and future marketing materials (e.g., a cool purple, a vibrant cyan, and a clean off-white).

**2. Technical Architecture:**
*   **Language:** **TypeScript**. It provides better DX, self-documenting code, and safety.
*   **Core Dependency:** **ZERO**. The final package will have no `dependencies`. This is a key selling point.
*   **Build Tool:** `tsup` or `unbuild`. Simple, fast, and great for building libraries.
*   **Testing:** `Vitest`. It's fast, has great TypeScript support, and is a joy to use.
*   **Repository Structure:**
    ```
    /log-vibe
      /src              // All TS source code
      /test             // All test files
      /docs             // Future documentation
      /scripts          // Build/publish scripts
      README.md
      LICENSE (MIT)
      package.json
      ```

**3. Define the MVP (Minimum Viable Product):**
The MVP is the absolute minimum to prove the concept and deliver value.
*   **Log Levels:** `info`, `success`, `warn`, `error`, `debug`.
*   **API:** `log.level(context, message, ...data)`.
*   **Output:** Color-coded, with icons, timestamps, and pretty-printed objects.
*   **No configuration.** It works perfectly with zero setup.

---

### Phase 1: Build the Core Library (Duration: 1-2 Weeks)

This is the initial development sprint to get `log-vibe` v1.0.0 out the door.

**1. Development Sprint:**
*   **Day 1-2:** Set up the repo, TypeScript config, and `tsup` build script.
*   **Day 3-5:** Implement the core logging logic in `src/index.ts`. Create the `formatter` function that handles colors, icons, and pretty-printing. Use snapshot testing in `Vitest` to lock down the ANSI output.
*   **Day 6-7:** Implement the `createScope` helper. Write comprehensive tests for all log levels and data types (objects, errors, arrays).
*   **Day 8-9:** Write the `README.md`. This is **not an afterthought**. It's the main marketing tool. Start with the beautiful screenshot, provide a 5-second setup guide, and show clear, commented examples.
*   **Day 10:** Final testing. Ensure it works in both CommonJS (`require`) and ES Modules (`import`) environments.

**2. Launch Day:**
*   **Publish:** `npm publish --access public`.
*   **Announce:**
    *   Tweet a thread with screenshots, explaining the "why."
    *   Post on relevant Reddit communities (r/node, r/javascript, r/webdev).
    *   Share on HackerNews (you never know!).
    *   Post on any relevant Discord/Slack communities.

---

### Phase 2: Polish & Community (Duration: 1-2 Months Post-Launch)

Listen to feedback and iterate. The goal is to refine the core experience and build a following.

**1. Gather Feedback:**
*   Actively monitor GitHub Issues and Discussions.
*   Ask on Twitter: "What do you think of `log-vibe`? What feature do you want next?"

**2. Develop v1.1.0 - "The Polish Update":**
*   **Global Configuration:** Implement a `configure(options)` function. Key options: `level` (to filter logs), `showTimestamp`, `showIcons`.
*   **Environment Variables:** Automatically respect `LOG_VIBE_LEVEL=warn`.
*   **Performance Timers:** Add `log.time(label)` and `log.timeEnd(label)`.

**3. Community Building:**
*   **"Build in Public" Posts:** Share your progress on v1.1. "Just added global config to log-vibe! It was a fun challenge to make it type-safe."
*   **Framework Helpers:** Create a new, tiny package: `@log-vibe/express`. It's just a simple middleware that logs incoming requests. This shows integration potential with minimal effort.
*   **Contribution Guide:** Add a `CONTRIBUTING.md` file to make it easy for others to submit PRs (e.g., for new themes or bug fixes).

---

### Phase 3: The Power-Up (Duration: 1-2 Months)

Introduce the companion app. This is the big next step that solidifies the project's vision.

**1. Design the Bridge:**
*   In `log-vibe` v2.0, add the **Custom Transport** API. This is the key.
    ```javascript
    import { addTransport } from 'log-vibe';
    addTransport((logObject) => { /* ... */ });
    ```

**2. Create `log-vibe-stream`:**
*   **New Repo:** Create a brand new repository: `log-vibe-stream`.
*   **The Server:** A tiny Node.js server using `ws` (WebSockets).
*   **The Client:** A simple, beautiful frontend built with `Vite` and `Vue` or `Svelte`. It should feel lightweight and fast.
*   **Features:**
    *   Real-time log stream.
    *   Search bar.
    *   Filters for level and context.
    *   Dark/Light theme toggle.

**3. Launch the Companion:**
*   Update the `log-vibe` README with a prominent section: "Want a live dashboard? Check out `log-vibe-stream`!"
*   Launch `log-vibe-stream` with its own announcement. Show a video of it in action.

---

### Phase 4: Ecosystem & Long-Term (Ongoing)

Nurture the project and ensure its longevity.

**1. Maintenance:**
*   Set up **Dependabot** for automated dependency updates (for dev dependencies).
*   Respond to issues and PRs in a timely manner.
*   Follow semantic versioning (`semver`) strictly.

**2. Ecosystem Growth:**
*   Create more official helpers: `@log-vibe/nestjs`, `@log-vibe/fastify`.
*   Encourage community contributions for new **themes** in the dashboard or new **transports** (e.g., a transport for sending logs to a specific file format).

**3. Governance:**
*   If the project gains significant traction, consider adding a `CODE_OF_CONDUCT.md` and looking for a co-maintainer to share the load.

---

### Key Success Metrics

*   **npm Downloads:** Track weekly and monthly downloads.
*   **GitHub Stars:** A measure of community interest.
*   **Community Engagement:** Number of issues, discussions, and pull requests.
*   **"Built with log-vibe":** See people mentioning it in their own projects or blog posts.
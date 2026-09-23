import { defineConfig } from "vitest/config";

// Separate from the unit-test config so `npm test` never touches the network.
export default defineConfig({
    test: {
        environment: "node",
        include: ["smoke/**/*.smoke.test.ts"],
        testTimeout: 20_000,
        // Setup hooks launch a browser and load a page that may have just been deployed; the 10s default timed out on staging once.
        hookTimeout: 60_000,
    },
});

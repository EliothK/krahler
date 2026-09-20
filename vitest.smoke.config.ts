import { defineConfig } from "vitest/config";

// Separate from the unit-test config so `npm test` never touches the network.
export default defineConfig({
    test: {
        environment: "node",
        include: ["smoke/**/*.smoke.test.ts"],
        testTimeout: 20_000,
    },
});

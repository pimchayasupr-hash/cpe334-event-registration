import { describe, it, expect } from 'vitest';

// Temporary deliberate failing test for Lab 5 Check C-02 (Issue #22).
// Verifies that GitHub Ruleset `protect-main-staging` blocks merging when
// required status check `test-and-docker` fails.
// DO NOT MERGE THIS PR. Close without merging after capturing evidence.
describe('C-02 Ruleset Enforcement Check (Issue #22)', () => {
  it('deliberately fails to verify test-and-docker blocks merge on staging', () => {
    expect('c02-ruleset-check').toBe('intentionally-failing');
  });
});

# Accepted run: C4 evaluation, run 1 of 5

`c4-run-1.json` is the accepted brief from run 1 of the C4 evaluation of the FP&A
Intelligence Engine, saved verbatim as provided. The run files themselves are not in
the engine repository.

- Derived from the run file with SHA-256
  `2e28c0fd155e74ec1af166a4de122d3095c5242057afe56b473109fc84ff8f5f`.
- Prompt `synthesis_v3`, configured and served model `claude-opus-5-5`.
- Packet hash `d726abc65d9d39f8077406bfcc3603596fd0dad36adb5e2421695d9f491409bc`.
- Final status ACCEPTED on attempt 1, no retry, 0 forbidden values, 0 unsupported numbers.

`scripts/export-engine-trace.py` reads this file, rebuilds the evidence packet from the
engine repository at a pinned commit, checks that the packet hash matches, and re-runs
the engine's validator on this brief. `npm run check:engine-trace` fails if this file
changes.

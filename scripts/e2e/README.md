# Headless end-to-end checks

Drive the real game in Chrome with the mock body/hand (`?demo=1`, dev server only).

    npm i --no-save puppeteer-core
    npm run dev            # in another terminal (port 1420)
    node scripts/e2e/river-story.mjs     # training + all 5 River levels via mockBody
    node scripts/e2e/river-leak.mjs      # enter/exit 3x with the real pose model; checks camera + canvas cleanup
    node scripts/e2e/butterfly-flow.mjs  # wrong-hold + auto-advance in Butterfly

They expect Chrome at /Applications/Google Chrome.app; edit `executablePath` elsewhere.

    node scripts/e2e/word-eggs-story.mjs # training + all 10 Word Eggs levels: wrong drop returns, right drop places (?demo=1&seed=N)
    node scripts/e2e/word-eggs-leak.mjs  # enter/exit 3x with the real hand model

    node scripts/e2e/market-catch-story.mjs  # training + all 10 Market Catch levels with a bot steering the mock body (also drops a wrong and a rotten fruit)
    node scripts/e2e/market-catch-flow.mjs   # tracking lost, pause/resume, time-out failure + retry
    node scripts/e2e/market-catch-leak.mjs   # enter/exit 3x with the real pose model; camera + canvas released

    node scripts/e2e/tabla-rhythm-story.mjs  # lessons + all 10 Tabla Rhythm levels; a bot times two mock hands to the audio clock (mockHands.left/right)
    node scripts/e2e/tabla-rhythm-flow.mjs   # pause freezes the rhythm, one-hand-lost vs both-lost, leaving cancels sounds
    node scripts/e2e/tabla-rhythm-leak.mjs   # enter/exit 3x with the real two-hand model

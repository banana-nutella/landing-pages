// ─────────────────────────────────────────────────────────────
//  THE APP'S DAILY "REPS" LIVE IN THIS FILE.
//  One rep is shown per day, in this order, then it loops.
//  Edit the text between the quotes, commit, and it's live in ~1 minute.
//  Keep each rep short: a title, a one-line "why", and 2-4 steps.
// ─────────────────────────────────────────────────────────────

module.exports = {
  reps: [
    {
      id: "name-it",
      title: "Name it before you react",
      minutes: 2,
      why: "Putting a word on a feeling takes some of the heat out of it.",
      steps: ["Notice where it shows up: jaw, chest, fists, gut.", "Name it in one word: annoyed, anxious, flat, wired.", "Say it in your head: \"That's frustration.\" Then decide what to do."],
    },
    {
      id: "long-exhale",
      title: "The long exhale",
      minutes: 1,
      why: "A slow breath out is the fastest way to bring your heart rate down.",
      steps: ["Breathe in through your nose for 4.", "Breathe out through your mouth for 8.", "Repeat 5 times. That's the rep."],
    },
    {
      id: "one-text",
      title: "Send one text",
      minutes: 2,
      why: "Small, regular contact is what keeps friendships alive.",
      steps: ["Pick one friend you haven't talked to in a while.", "Send something low-effort: \"Saw this and thought of you\" or \"How's it going?\"", "No need to go deep. Just reopen the line."],
    },
    {
      id: "pressure-plan",
      title: "Pre-game the hard moment",
      minutes: 3,
      why: "Deciding how you'll respond ahead of time beats improvising under pressure.",
      steps: ["Think of one tense moment coming up this week.", "Picture it going sideways. What's your first reaction?", "Pick the one thing you'll do instead (pause, breathe, ask a question)."],
    },
    {
      id: "brain-dump",
      title: "Brain dump",
      minutes: 3,
      why: "Getting it out of your head and onto paper makes it smaller.",
      steps: ["Set a 2-minute timer.", "Write everything on your mind. No order, no editing.", "Circle one thing you can actually act on today."],
    },
    {
      id: "listen-rep",
      title: "Listen without fixing",
      minutes: 2,
      why: "Most people want to be heard first, solved second.",
      steps: ["Next time someone vents, don't offer a fix right away.", "Ask one follow-up: \"What's the worst part?\"", "Then ask: \"Want ideas, or just need to get it out?\""],
    },
    {
      id: "wind-down",
      title: "Shut it down",
      minutes: 3,
      why: "A fixed wind-down tells your body it's time to sleep.",
      steps: ["Pick a screens-off time 30 minutes before bed.", "Write tomorrow's top 3 so your brain can let go.", "Lights low. Same time tomorrow."],
    },
    {
      id: "anger-check",
      title: "Anger is a signal",
      minutes: 2,
      why: "Anger usually sits on top of something else: stress, hurt, or feeling disrespected.",
      steps: ["Think of the last time you got angry.", "Ask: what was under it? Tired, stressed, hurt, embarrassed?", "Next time, name the thing underneath."],
    },
    {
      id: "win-log",
      title: "Log one win",
      minutes: 1,
      why: "Your brain remembers the misses. Make it notice the hits.",
      steps: ["Write down one thing that went right today, however small.", "Write what you did to make it happen."],
    },
    {
      id: "reframe",
      title: "Reframe the story",
      minutes: 3,
      why: "The story you tell yourself about a setback changes how hard it hits.",
      steps: ["Pick something that's bugging you.", "Write the story you're telling yourself about it.", "Write one other explanation that's just as likely."],
    },
    {
      id: "move-reset",
      title: "Two-minute reset",
      minutes: 2,
      why: "Moving your body is the quickest way to shift your mood.",
      steps: ["Stand up. 20 squats or a brisk walk around the block.", "Notice how your head feels before vs after."],
    },
    {
      id: "say-it",
      title: "Say the thing",
      minutes: 3,
      why: "Unsaid stuff builds up. Small, clear statements stop it piling up.",
      steps: ["Think of something you've been holding back from someone.", "Write it as one sentence: \"When X happens, I feel Y.\"", "Decide if and when you'll say it."],
    },
    {
      id: "values",
      title: "What actually matters",
      minutes: 3,
      why: "Knowing what you care about makes hard calls easier.",
      steps: ["Write the 3 things you most want people to say about you.", "Pick one. What's one thing you did this week that matched it?"],
    },
    {
      id: "check-in-friend",
      title: "Check on someone",
      minutes: 2,
      why: "The friend who seems fine is often the one nobody asks.",
      steps: ["Think of a friend who's been quiet or going through it.", "Ask straight up: \"How are you actually doing?\"", "If they open up, just listen."],
    },
  ],

  // Shown in the app's footer and when someone logs a very low mood.
  crisisLine: "Not okay right now? In the US, call or text 988. Elsewhere: findahelpline.com",
};

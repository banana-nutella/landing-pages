// ─────────────────────────────────────────────────────────────
//  ALL THE WORDS ON THE SITE LIVE IN THIS FILE.
//  Edit the text between the quotes, commit, and Vercel redeploys
//  automatically in about a minute. Don't delete the quotes or commas.
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Small label in the top-left corner of every page.
  brand: "Early access",

  // Text that is the same on every variant.
  button: "Get early access",
  finePrint: "No spam. Anonymous by default.",
  emailPlaceholder: "you@email.com",
  helpQuestion: "What would you want help with most?",
  helpOptions: ["Stress", "Anger", "Relationships", "Feeling stuck", "Not sure"],
  chatCheckbox: "Open to a 15-min chat about this?",
  inviteCheckbox: "Would you invite 1-2 friends when it launches?",
  thanksTitle: "You're in.",
  thanksText: "We'll email you when it's ready. Nothing before that.",

  // The four variants. Only the headline and subline differ.
  variants: {
    a: {
      name: "Training log",
      headline: "Train your head like you train your body.",
      subline: "Track mood, stress, and sleep next to your workouts. See what actually moves the needle.",
    },
    b: {
      name: "Tactical",
      headline: "Emotional intelligence is a skill. Here's the playbook.",
      subline: "Short daily reps that make you better under pressure, in relationships, and at work.",
    },
    c: {
      name: "Anonymous",
      headline: "Talk it out. Nobody has to know.",
      subline: "Anonymous, judgment-free space built for guys who'd never post about this.",
    },
    d: {
      name: "Locker room",
      headline: "The group chat, but for the stuff you don't say in the group chat.",
      subline: "Private check-ins with the friends you pick. No feed, no followers.",
    },
  },
};

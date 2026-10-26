# Chrome Web Store listing – copy and paste

## Store listing tab

**Name** (from manifest): Drip – Water Reminder Buddy

**Summary** (from manifest, max 132 characters):
A cute animated water-drop buddy peeks onto your screen and reminds you to drink water at regular intervals.

**Category:** Lifestyle → Well-being

**Language:** English

**Description:**

Meet Drip, a little water-drop buddy who makes sure you stay hydrated while you work.

Every 45 minutes (or any interval you choose), Drip pops onto your screen with a water bottle and a friendly "Drink Water!" message. No boring notification boxes. Drip peeks in from a corner, or waddles across the bottom of your screen, waves, and slips away again.

WHAT DRIP DOES
• Reminds you to drink water at regular intervals (default: every 45 minutes)
• Two animations: peek from any corner, or walk across the screen
• "I drank it!" logs a glass, Drip takes a big gulp and celebrates with you
• Snooze for a few minutes when you're busy
• Daily goal with progress droplets and a 7-day history
• Live countdown and today's count in the toolbar popup
• Pause for 30 minutes, 1 hour, 2 hours or until tomorrow
• Active hours: only remind during your working hours and days
• Waits while you're away from the computer, then reminds you when you're back
• Falls back to a system notification when Chrome isn't the active window
• Small, medium or large character, optional soft sound
• Works on light and dark sites, never steals keyboard focus, respects "reduce motion"

PRIVACY
Drip keeps everything in your browser. No accounts, no analytics, no tracking, no network requests.

## Graphic assets (folder: store/images)

- Store icon 128×128: `store-icon-128.png`
- Screenshots 1280×800: `screenshot-1-peek.png`, `screenshot-2-walk.png`, `screenshot-3-goal.png`, `screenshot-4-popup.png`
- Small promo tile 440×280: `promo-small-440x280.png`
- Marquee promo tile 1400×560 (optional): `promo-marquee-1400x560.png`

## Privacy practices tab

**Single purpose description:**
Drip reminds the user to drink water at regular intervals by showing an animated character on the current page, and lets the user log glasses of water.

**Permission justifications:**

- **alarms** – Schedules the next water reminder, snoozes and pauses, even when the service worker is asleep.
- **storage** – Saves the user's settings and the daily count of glasses, locally in the browser.
- **scripting** – Inserts the animated reminder character into the active tab only at the moment a reminder is due.
- **notifications** – Shows a system notification instead of the character when Chrome is not the active window or the current page cannot show the character (for example chrome:// pages).
- **idle** – Checks whether the user is away or the screen is locked, so reminders wait until the user is back.
- **offscreen** – Plays the short reminder sound effect, which a web page would otherwise block until the user clicks on it.
- **Host permissions (http://*/*, https://*/*)** – Needed so the reminder can appear on whatever website the user is on when the timer ends. The extension does not read page content, collect browsing data or modify the page beyond adding and removing its own reminder element.

**Remote code:** No, I am not using remote code. All code is included in the package.

**Data usage:** Check none of the data types. Then confirm all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** the public URL where you host `privacy-policy.html` (see README, step "Host the privacy policy").

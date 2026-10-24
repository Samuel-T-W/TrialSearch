# UI vision: feeds, per-trial questions, and status tabs

Owner: Samuel. Status: agreed direction, not built yet.
This replaces the current single intake-then-results flow as the target experience.

## Why

Reviewers will judge TrialSearch by what they see when they open the link.
The pipeline and matcher matter less to them than the experience, so the front end is the priority.

## Flow

1. **Sign in as a test patient.**
   The landing screen lists the test profiles (from `pipeline/personas.ts`).
   Pick one and press Log in.
   There is no real account; it loads that profile.
2. **Feeds.**
   A feed is a saved search, like a queue of trials.
   - The default feed is "Everything I might be eligible for", with no condition filter.
   - The user can add more feeds filtered by condition or topic, for example "Diabetes trials".
   - Each feed is listed separately and opens on its own.
3. **Inside a feed.**
   The feed shows trials the user might qualify for.
   Trials we can rule out automatically (hard filters and any "not met" check) are removed.
   Almost no trial will be a sure match up front, because most have rules only the user can answer.
   The user works through the feed one trial at a time.
4. **Inside a trial.**
   The user answers that trial's open questions, one at a time.
   When the questions are done, the app says whether they qualify.
   - Qualified: the trial moves to the **Qualified** tab and stays there.
   - Not qualified: it leaves the feed (and can be seen in Archive).
   Rules that need a doctor or a lab test stay "to confirm with the study team" and do not block qualifying.
5. **Register interest.**
   A qualified trial offers a **Register interest** button.
   Pressing it plays a short "sent" animation (for example a letter going into a mailbox).
   The trial then moves to the **Registered interest** tab.
   If the user qualifies but does not register, it stays under Qualified.
6. **Archive.**
   The user can archive any trial from any tab, including registered ones.
   Archived trials live in an **Archive** tab and can be restored.

## Tabs

| Tab | Holds |
|---|---|
| Feed | Trials where it is still unsure whether the user qualifies |
| Qualified | Trials the user answered all questions for and qualified |
| Registered interest | Qualified trials the user sent interest for |
| Archive | Anything the user archived, plus trials they did not qualify for |

There is no separate "Not qualified" tab.
A trial the user does not qualify for moves to Archive with a **Not qualified** tag.
A trial the user archived by hand also goes to Archive, tagged with the state it had: **Qualified**, **Not qualified**, or **Unsure**.

## Test profiles start part-way through

Each preset test profile opens in a realistic, lived-in state, not empty:
- one or two trials already under Registered interest,
- some in Qualified,
- some in the Feed with questions still to answer,
- possibly a few in Archive.

The starting state is fixed per profile.
Choices made during a session are not saved.
Logging out and back in as the same profile resets it to that starting state.

## Make your own profile

Next to the preset profiles there is a "Create my own" option.
It runs a short intake flow (age, sex, ZIP, distance, conditions, medicines, language) to build a profile.
The matcher then runs that profile against the shipped trials and fills the Feed, starting with no answers, qualified, registered, or archived trials.
The user then goes through the same flow as any other profile.
This profile is not saved either; after logging out, the user has to create it again.

## Devices

The app must look good and work well on both a phone (375px wide) and a laptop.
On a laptop, use the extra width (for example a list next to the open trial) instead of stretching the phone layout.

## Constraints that still apply

- Matching stays on the device; profiles and answers never leave the browser (see `docs/PRIVACY.md`).
- "Register interest" is a demo action unless a real contact path is agreed; it must not send personal data anywhere by default.
- Keep the six languages working.
- Mobile first (375px wide), and equally good on a laptop.
- Session-only state: nothing about a login, answers, or tab moves is persisted.

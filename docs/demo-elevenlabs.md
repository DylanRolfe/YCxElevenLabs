# Demo script: we are ElevenLabs

Story: one of us is the ElevenLabs CEO looking for new customers. Rehearsal Rep
finds leads, drafts and rehearses the email, and we approve it. Then another one
of us plays the lead, opens the talk link and questions the AI rep, which
answers from the ElevenLabs brief.

How the data flows: whatever is in **Your brief > Pitch** on the dashboard is
copied onto every new lead (`seller_pitch`). The draft email, the buyer panel
and the voice agent (`{{seller_pitch}}`) all read it. So the pitch below is the
agent's entire knowledge of ElevenLabs. Anything not in it, the agent answers
with "the owner can confirm".

## 0. Before the demo (once)

1. ElevenLabs agent: paste the first message, system prompt, placeholders,
   90 second limit and the four data-collection fields from
   [elevenlabs-agent.md](elevenlabs-agent.md), then Publish. Without this the
   call is a generic "How can I help you today?" bot.
2. Dashboard on a fresh browser profile: fill in the brief below (it is saved in
   that browser's localStorage, so use the demo laptop).
3. Pricing and language counts below were checked on elevenlabs.io on
   2026-11-22. The product descriptions are general; skim them once.

## 1. The brief (paste into the dashboard)

**Business name**

```
ElevenLabs
```

**Pitch**

```
ElevenLabs is an AI audio research and deployment company. We make voice AI that sounds human, used through our web app or our API.

Products:
- Text to Speech: lifelike speech from text in 90+ languages, with a library of thousands of voices. Low-latency models for real-time use, and expressive models for narration, audiobooks and video.
- Agents Platform: build voice agents that talk to customers in real time, on the web, in apps or over the phone. They can use a company's knowledge base, call tools and APIs, hand off to a human, and every call can trigger a webhook with a summary and extracted data.
- Speech to Text: accurate transcription with speaker labels and timestamps.
- Voice cloning: a custom brand voice from a short sample, with safeguards so only the voice owner can clone it.
- Dubbing: translate video and audio into other languages while keeping the original speaker's voice.
- Sound effects and music generation for content teams.

Who it is for: customer support and sales teams that want a 24/7 voice agent, media and publishers doing audiobooks, podcasts and localisation, and developers building voice into their own products.

Why teams pick us: the most natural-sounding voices, many languages from one platform, a developer-friendly API, and enterprise options (security reviews, data controls, volume pricing).

Languages: our newest speech and transcription models support 90+ languages, and dubbing covers 90+ languages too.

Speed: our fastest voices respond in about 75 milliseconds, fast enough for live conversation.

Pricing for voice agents (ElevenAgents, billed by call minutes):
- Free: $0 a month, 15 minutes of calls, includes knowledge base, multilingual and the web widget.
- Starter: $6 a month, 75 minutes. Creator: $22 a month, 275 minutes. Pro: $99 a month, 1,238 minutes.
- Scale: $299 a month, 3,738 minutes, 30 concurrent calls. Business: $990 a month, 12,375 minutes, 40 concurrent calls.
- Extra minutes are $0.08 per minute on every plan. LLM usage is billed separately at cost. Phone providers like Twilio bill separately.
- Enterprise: custom pricing with higher concurrency, SSO, custom SLAs, and BAAs for HIPAA customers.
- There is no limit on how many agents you can build on any plan.

Getting started: start free, no card needed to try it. The best next step is a 15 minute call with our team to scope a pilot and the right plan for your call volume.
```

Pricing checked on elevenlabs.io/pricing/agents on 2026-11-22. It excludes the
Black Friday and "$1 first month" promos, which expire. One page detail was
inconsistent (text message price), so it is left out.

Keep the pitch to facts you can stand behind. The agent is told never to invent
prices, customers or numbers, so if you want it to quote a price or name a
customer on stage, put that exact fact in the pitch.

## 2. Finding leads

In **Find leads**, use one target type the audience will get instantly:

```
Heads of customer support at mid-size e-commerce companies
```

Backups: `Audiobook and podcast publishers`, `Language learning apps`.

Fiber returns real companies and contacts. Do not approve and send to them
during the demo unless you mean to email a real person (Gmail is off, so it
only logs today).

## 3. The lead we call as

Add one lead by hand so the person playing the buyer controls it:

| Field | Value |
|---|---|
| Company | Northwind Outfitters |
| Contact name | (the teammate playing the lead) |
| Title | Head of Customer Support |
| Email | that teammate's own email |
| About | Online outdoor gear retailer, about 200 staff. Support team of 25 handles 3,000 calls a week, mostly order status and returns. Long hold times at peak season. |

Then: **Draft email** > it rehearses (Maritime, or `npm run panel`) > show the
panel's predicted objection and the rewritten email > **Approve and send** >
open the talk link from the lead page.

## 4. Questions to ask the agent (the lead's script)

The call is capped at 90 seconds, so pick four or five:

1. "What does ElevenLabs actually do for a support team like mine?"
2. "Could it handle order-status and returns calls on its own?"
3. "We have customers in Quebec and Mexico. Does it speak French and Spanish?"
4. "What happens when the AI can't answer? Can it hand off to a person?"
5. "We get about 3,000 calls a week. What would that cost?" (it should quote
   plan prices and the $0.08 per extra minute from the pitch, then offer the
   call to size it; it should not do invented maths on your volume)
6. "My worry is it'll sound robotic and annoy customers." (this is the
   objection; it should answer and propose the 15 minute call)
7. "Sure, book the call."

## 5. The payoff

Back on the lead page, after the webhook lands (a few seconds): the lead card
shows the **need**, the **real objection** next to the panel's **predicted
objection**, the agreed **next step** and the **interest level**. That
side-by-side is the end of the demo.

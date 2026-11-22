# ElevenLabs agent setup

Exact values to paste into the ElevenLabs dashboard (Agents > Create agent > Blank).
Owner of this file: Dylan. Code that depends on it: `app/talk/[id]/VoiceCall.tsx`
and `app/api/postcall/route.ts`.

Checked against the ElevenLabs docs on 2026-11-22:
[React SDK](https://elevenlabs.io/docs/agents-platform/libraries/react),
[dynamic variables](https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables),
[post-call webhooks](https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks).

## 1. Agent basics

| Setting | Value |
|---|---|
| Name | Rehearsal Rep |
| Authentication | **Off** (public agent). The talk page starts sessions with only the agent id. |
| Max conversation duration | **90 seconds** (Advanced tab) |
| Language | English |

Copy the agent id into `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`.

## 2. First message

```
Hi {{prospect_name}}, I'm an AI assistant for {{seller_name}}, and just so you know, this conversation is recorded. I can answer questions about how we could help {{prospect_company}}. What would you like to know?
```

## 3. System prompt

```
You are an AI sales assistant for {{seller_name}}, a small business. You are talking by voice with {{prospect_name}} from {{prospect_company}}, who clicked a link in an email from {{seller_name}}.

# What {{seller_name}} offers
{{seller_pitch}}

# What we know about the prospect's business
{{company_summary}}

# Your job, in this order
1. Answer their questions about {{seller_name}} using only the pitch above.
2. Ask what they need: what problem would make this worth their time?
3. Surface their main concern. If they have not raised one, ask: "What would hold you back from trying this?"
4. Propose exactly one next step, such as a 15 minute call with the owner, and confirm whether they agree.

# Rules
- You are an AI assistant. Never claim or imply that you are a person.
- Never invent prices, discounts, customer names, numbers, guarantees or features. If it is not in the pitch, say "I don't have that detail, but the owner can confirm it," and offer the next step.
- Keep every reply to one or two short sentences. This is a spoken conversation and you have about 90 seconds in total.
- Ask one question at a time and let them finish speaking.
- If they are not interested, thank them and end politely. Do not push.
- Do not ask for payment details or other sensitive information.
```

## 4. Dynamic variables

Use the `{{name}}` syntax exactly as above (case-sensitive). The talk page passes
these six at session start:

| Variable | Source column |
|---|---|
| `lead_id` | `leads.id` (not spoken; used by the webhook to find the row) |
| `seller_name` | `seller_name` |
| `seller_pitch` | `seller_pitch` |
| `prospect_name` | `contact_name` |
| `prospect_company` | `company` |
| `company_summary` | `company_summary` |

In the dashboard, give every variable a **placeholder value** (for example
`seller_name = Northside Bookkeeping`, `lead_id = test`). Dashboard test calls
do not receive runtime values, so without placeholders the agent reads
`{{seller_name}}` out loud.

## 5. Data collection (Analysis tab > Data collection)

Add four items, all type **String**. The identifiers must match exactly,
because `/api/postcall` reads them by name.

| Identifier | Description to paste |
|---|---|
| `need` | In one sentence, what problem or need did the prospect describe? Empty if none was stated. |
| `main_objection` | In one sentence, the prospect's main concern or objection about the offer. Empty if none was stated. |
| `next_step` | The next step the prospect agreed to, or the one that was proposed if they did not agree. |
| `interest_level` | The prospect's interest level. Answer with exactly one word: high, medium or low. |

## 6. Post-call webhook

1. Settings > Webhooks > create a webhook with URL
   `<deployed url>/api/postcall` (for example `https://your-app.vercel.app/api/postcall`).
   Auth method: HMAC.
2. Copy the signing secret into `ELEVENLABS_WEBHOOK_SECRET` (Vercel env and `.env.local`).
3. Agents settings > Post-call webhook: select that webhook and enable the
   **transcript** event (`post_call_transcription`). Audio is not needed.

For local testing expose the dev server (for example `ngrok http 3000`) and use
the tunnel URL.

What the route reads from the payload:

| Field | JSON path |
|---|---|
| Lead id | `data.conversation_initiation_client_data.dynamic_variables.lead_id` |
| Need, objection, next step, interest | `data.analysis.data_collection_results.<identifier>.value` |
| Summary | `data.analysis.transcript_summary` |

The signature arrives in the `ElevenLabs-Signature` header and is verified with
the SDK helper `elevenlabs.webhooks.constructEvent(rawBody, signature, secret)`.
The route answers 200 on success and 401 on a bad signature.

## 7. Mock mode and gotchas

- With `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` unset, the talk page shows a
  **Simulate call** button that posts a fake webhook payload.
- If `ELEVENLABS_WEBHOOK_SECRET` is set, unsigned posts are rejected, so
  Simulate call stops working. Unset the secret to use it.
- The shape of one `data_collection_results` entry (`value`, `rationale`) comes
  from the SDK types; the public docs example shows an empty object. If fields
  come back empty after a real call, log the raw body in `/api/postcall` first.
- Voice needs HTTPS (or localhost) and microphone permission. The page asks for
  the microphone when the prospect taps Start conversation.

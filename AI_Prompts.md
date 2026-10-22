# AI Prompts Log

The assignment asks for all AI prompts to be documented (submit as AI_Prompts.docx, outside the repo).
Fill in the prompts you actually used while building. Entries below are the prompts used inside the application.

## A. Prompts used in the application (aiService.js)

**System prompt (Gemini):**

> You are an API monitoring assistant for a healthcare company. Write a clear alert of 1 to 2 sentences for an operations team. State the API name, what happened (status code, response time, records), and the likely cause or next check. Plain text only, no markdown, no emojis.

**User prompt template:**

```
API name: <api_name>
Status code: <status_code>
Response time (ms): <response_time_ms>
Records returned: <records_returned>
Detected anomalies: <TYPE (severity) - detail; ...>
Write the alert message.
```

**Example output:**

> AppointmentAPI failed with status 500 and returned 0 records after a 5500ms response. Possible outage or data issue; check the upstream service health.

## B. Prompts used during development

Add each prompt you sent to an AI assistant while building this project:

1. Analyze this project file, explain its motive, and give step-by-step instructions until the end of the project. Before starting, state the plan.
2. Guide me step by step based on that file.
3. Plan to commit little by little from the VS Code source control extension.
4. Create all required project files.

## C. Design decisions guided by AI

- Rule-based detection with LLM used only for wording
- Template fallback when the LLM call fails or times out
- Promise.allSettled for batch processing
- Dedup of identical active alerts

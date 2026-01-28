# HEALTH/OS API Reference

> **Base URL**: `https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1`  
> **Authentication**: API Key via `x-api-key` header or `Authorization: Bearer <key>`  
> **API Key Format**: `ftrk_[32 alphanumeric characters]`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Edge Functions](#edge-functions)
   - [analyze-food](#analyze-food)
   - [generate-workout](#generate-workout)
   - [parse-food-text](#parse-food-text)
   - [api-key](#api-key)
   - [api](#api)
   - [mcp](#mcp)
   - [send-auth-email](#send-auth-email)
   - [telegram-water-reminder](#telegram-water-reminder)
3. [MCP Server Tools](#mcp-server-tools)
4. [Error Codes](#error-codes)
5. [Rate Limits](#rate-limits)

---

## Authentication

### User Authentication (Supabase Auth)

All client-side requests use Supabase's built-in authentication with JWT tokens.

```typescript
import { supabase } from "@/integrations/supabase/client";

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});

// Get session
const { data: { session } } = await supabase.auth.getSession();
```

### API Key Authentication (External Access)

For MCP server and REST API access:

```bash
# Header authentication
curl -H "x-api-key: ftrk_your_api_key_here" \
  https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api/workouts

# Bearer token authentication
curl -H "Authorization: Bearer ftrk_your_api_key_here" \
  https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api/workouts
```

---

## Edge Functions

### analyze-food

Analyzes a food image using AI to estimate calories and nutritional content.

**Endpoint**: `POST /analyze-food`

**Headers**:
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request Body**:
```json
{
  "imageUrl": "https://storage.example.com/meal-photos/image.jpg"
}
```

**Success Response** (200):
```json
{
  "foods": [
    {
      "name": "Grilled Chicken Breast",
      "portion": "150g",
      "calories": 248
    },
    {
      "name": "Brown Rice",
      "portion": "1 cup",
      "calories": 216
    },
    {
      "name": "Steamed Broccoli",
      "portion": "100g",
      "calories": 35
    }
  ],
  "total_calories": 499,
  "confidence": 0.87,
  "description": "Healthy meal with grilled chicken, brown rice, and steamed broccoli"
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Image URL is required` | Missing imageUrl in request body |
| 429 | `Rate limit exceeded` | Too many requests, retry later |
| 402 | `AI credits exhausted` | Lovable AI credits depleted |
| 500 | `Failed to analyze image` | AI processing error |

**Example**:
```typescript
const { data, error } = await supabase.functions.invoke('analyze-food', {
  body: { imageUrl: 'https://...' }
});

if (data) {
  console.log(`Total calories: ${data.total_calories}`);
  console.log(`Confidence: ${(data.confidence * 100).toFixed(0)}%`);
}
```

---

### generate-workout

Generates a personalized 6-day PPL workout routine based on user goals.

**Endpoint**: `POST /generate-workout`

**Headers**:
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request Body**:
```json
{
  "goals": "I'm a 30-year-old male, 180cm, 80kg. I want to build muscle and increase strength. I can train 6 days per week and have access to a full gym. Focus on compound movements."
}
```

**Success Response** (200):
```json
{
  "routine": {
    "routineName": "12-Week Strength & Hypertrophy Program",
    "days": {
      "Day 1": {
        "name": "Push A",
        "focus": "Chest & Shoulders",
        "exercises": [
          {
            "name": "Barbell Bench Press",
            "category": "primary",
            "targetWeight": "70kg",
            "targetReps": "4x6-8"
          },
          {
            "name": "Incline Dumbbell Press",
            "category": "primary",
            "targetWeight": "26kg",
            "targetReps": "4x8-10"
          },
          {
            "name": "Overhead Press",
            "category": "primary",
            "targetWeight": "45kg",
            "targetReps": "4x6-8"
          },
          {
            "name": "Lateral Raises",
            "category": "accessory",
            "targetWeight": "12kg",
            "targetReps": "4x12-15"
          },
          {
            "name": "Cable Flyes",
            "category": "accessory",
            "targetWeight": "15kg",
            "targetReps": "3x12-15"
          },
          {
            "name": "Tricep Pushdown",
            "category": "accessory",
            "targetWeight": "30kg",
            "targetReps": "3x12-15"
          }
        ]
      },
      "Day 2": { "name": "Pull A", "focus": "Back & Biceps", "exercises": [...] },
      "Day 3": { "name": "Legs A", "focus": "Quads & Glutes", "exercises": [...] },
      "Day 4": { "name": "Push B", "focus": "Shoulders & Chest", "exercises": [...] },
      "Day 5": { "name": "Pull B", "focus": "Back Width", "exercises": [...] },
      "Day 6": { "name": "Legs B", "focus": "Hamstrings & Posterior", "exercises": [...] }
    }
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Please provide your fitness goals` | Empty or missing goals |
| 429 | `Rate limit exceeded` | Too many requests |
| 402 | `AI credits exhausted` | Lovable AI credits depleted |
| 500 | `Failed to generate workout routine` | AI processing error |
| 500 | `Failed to parse routine` | Invalid AI response format |

**Example**:
```typescript
const { data, error } = await supabase.functions.invoke('generate-workout', {
  body: { 
    goals: 'Beginner looking to build strength. 3 days per week available.'
  }
});

if (data?.routine) {
  // Save to custom_routines table
  await supabase.from('custom_routines').insert({
    user_id: userId,
    routine_name: data.routine.routineName,
    routine_data: data.routine.days,
    is_active: true
  });
}
```

---

### parse-food-text

Parses natural language food descriptions into structured nutritional data.

**Endpoint**: `POST /parse-food-text`

**Headers**:
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request Body**:
```json
{
  "text": "2 chicken tacos, a side of rice, and a diet coke"
}
```

**Success Response** (200):
```json
{
  "foods": [
    {
      "name": "Chicken Taco",
      "quantity": 2,
      "calories": 340,
      "protein": 24,
      "carbs": 28,
      "fat": 14
    },
    {
      "name": "Mexican Rice",
      "quantity": 1,
      "calories": 180,
      "protein": 4,
      "carbs": 36,
      "fat": 3
    },
    {
      "name": "Diet Coke",
      "quantity": 1,
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ],
  "total": {
    "calories": 520,
    "protein": 28,
    "carbs": 64,
    "fat": 17
  }
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Text is required` | Missing text in request body |
| 429 | `Rate limit exceeded` | Too many requests |
| 500 | `Failed to parse food` | AI processing error |

---

### api-key

Manages user API keys for external access.

**Endpoint**: `GET /api-key` | `POST /api-key`

**Headers**:
```
Authorization: Bearer <supabase_jwt>
```

#### GET - Retrieve API Key

**Success Response** (200):
```json
{
  "api_key": "ftrk_abc123xyz789...",
  "created_at": "2025-01-15T10:30:00Z",
  "last_used_at": "2025-01-28T14:22:00Z"
}
```

If no key exists, one is automatically generated:
```json
{
  "api_key": "ftrk_newkey123...",
  "created_at": "2025-01-28T15:00:00Z",
  "last_used_at": null,
  "is_new": true
}
```

#### POST - Regenerate API Key

**Success Response** (200):
```json
{
  "api_key": "ftrk_brandnewkey...",
  "created_at": "2025-01-28T15:05:00Z",
  "last_used_at": null,
  "regenerated": true
}
```

**Error Responses**:

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Missing authorization header` | No auth token provided |
| 401 | `Invalid or expired token` | Invalid JWT |
| 405 | `Method not allowed` | Only GET/POST supported |

---

### api

REST API for read-only access to user data. Authenticated via API key.

**Base Path**: `/api`

#### GET /api/workouts

List recent workouts.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 10 | Max results (1-100) |
| offset | number | 0 | Pagination offset |

**Response**:
```json
{
  "workouts": [
    {
      "id": "uuid",
      "date": "2025-01-28",
      "day": "Day 1",
      "day_name": "Push A",
      "workout_duration_minutes": 65,
      "post_difficulty": 7,
      "post_satisfaction": 8
    }
  ],
  "total": 45,
  "limit": 10,
  "offset": 0
}
```

#### GET /api/workouts/:id

Get single workout with exercises.

**Response**:
```json
{
  "workout": {
    "id": "uuid",
    "date": "2025-01-28",
    "day_name": "Push A",
    "exercises": [
      {
        "name": "Barbell Bench Press",
        "sets": [
          { "set_number": 1, "weight": 80, "reps": 6 },
          { "set_number": 2, "weight": 80, "reps": 6 }
        ]
      }
    ]
  }
}
```

#### GET /api/meals

List meals for a date range.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string | today | Single date (YYYY-MM-DD) |
| start | string | - | Range start date |
| end | string | - | Range end date |

#### GET /api/metrics

Get daily metrics.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string | today | Date (YYYY-MM-DD) |

---

### mcp

Model Context Protocol server for AI assistant integration.

**Endpoint**: `POST /mcp`

**Protocol**: JSON-RPC 2.0 with SSE transport

**Headers**:
```
x-api-key: ftrk_your_api_key
Content-Type: application/json
```

See [MCP Server Tools](#mcp-server-tools) for available tools.

---

### send-auth-email

Sends custom authentication emails via Resend.

**Endpoint**: `POST /send-auth-email`

**Request Body**:
```json
{
  "type": "password_reset",
  "email": "user@example.com",
  "redirectUrl": "https://app.example.com/auth?type=recovery"
}
```

**Supported Types**:
- `password_reset` - Password reset email
- `email_confirmation` - Email verification

**Note**: This is typically called internally by the auth hooks, not directly.

---

### telegram-water-reminder

Sends water reminders via Telegram bot.

**Endpoint**: `POST /telegram-water-reminder`

**Request Body**:
```json
{
  "chat_id": "123456789",
  "message": "Time to drink water! 💧"
}
```

**Required Secret**: `TELEGRAM_BOT_TOKEN`

---

## MCP Server Tools

The MCP server exposes 9 tools for AI assistant integration:

### get_today_summary

Get today's health summary.

**Input**: None

**Output**:
```json
{
  "date": "2025-01-28",
  "workout": { "completed": true, "day_name": "Push A", "duration": 65 },
  "nutrition": { "calories": 1850, "protein": 145, "goal": 2200 },
  "hydration": { "current": 2.5, "goal": 3.0 },
  "sleep": { "hours": 7.5, "goal": 8 },
  "energy": 4
}
```

### get_workouts

Get recent workout history.

**Input**:
```json
{ "limit": 10, "offset": 0 }
```

### get_personal_records

Get personal records across all exercises.

**Input**: None

**Output**:
```json
{
  "records": [
    { "exercise": "Barbell Bench Press", "weight": 100, "reps": 5, "date": "2025-01-20" },
    { "exercise": "Barbell Squat", "weight": 140, "reps": 3, "date": "2025-01-15" }
  ]
}
```

### get_weekly_stats

Get current week statistics.

**Input**: None

**Output**:
```json
{
  "workouts_completed": 4,
  "workouts_goal": 5,
  "total_volume": 45000,
  "avg_workout_duration": 58,
  "calories_avg": 2100,
  "protein_avg": 155
}
```

### get_daily_metrics

Get metrics for a specific date.

**Input**:
```json
{ "date": "2025-01-28" }
```

### get_meals

Get meals for a date range.

**Input**:
```json
{ "start_date": "2025-01-21", "end_date": "2025-01-28" }
```

### get_water_logs

Get water intake logs.

**Input**:
```json
{ "date": "2025-01-28" }
```

### get_performance_insights

Get AI-generated performance insights.

**Input**: None

**Output**:
```json
{
  "trends": [
    "Bench press increased 5kg over last 4 weeks",
    "Sleep quality correlates strongly with energy levels"
  ],
  "recommendations": [
    "Consider a deload week - volume has been high",
    "Increase protein intake on training days"
  ]
}
```

### get_body_metrics

Get body composition data.

**Input**:
```json
{ "days": 30 }
```

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Missing/invalid auth token |
| 402 | Payment Required | AI credits exhausted |
| 403 | Forbidden | RLS policy denied access |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication token required |
| `AUTH_INVALID` | Token expired or invalid |
| `RATE_LIMITED` | Too many requests |
| `CREDITS_EXHAUSTED` | AI credits depleted |
| `VALIDATION_ERROR` | Invalid input data |
| `NOT_FOUND` | Resource not found |
| `RLS_DENIED` | Row-level security blocked access |

---

## Rate Limits

### Edge Functions

| Function | Limit | Window |
|----------|-------|--------|
| analyze-food | 10 requests | per minute |
| generate-workout | 5 requests | per minute |
| parse-food-text | 20 requests | per minute |
| api | 100 requests | per minute |
| mcp | 60 requests | per minute |

### Database Queries

- Default Supabase limit: 1000 rows per query
- Pagination recommended for large datasets

### Handling Rate Limits

```typescript
try {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageUrl }
  });
  
  if (error?.message?.includes('Rate limit')) {
    // Wait and retry
    await new Promise(r => setTimeout(r, 5000));
    // Retry request...
  }
} catch (e) {
  console.error('Request failed:', e);
}
```

---

## SDK Examples

### TypeScript/JavaScript

```typescript
import { supabase } from "@/integrations/supabase/client";

// Analyze food
const analyzeFood = async (imageUrl: string) => {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageUrl }
  });
  if (error) throw error;
  return data;
};

// Generate workout
const generateWorkout = async (goals: string) => {
  const { data, error } = await supabase.functions.invoke('generate-workout', {
    body: { goals }
  });
  if (error) throw error;
  return data.routine;
};
```

### cURL

```bash
# Get API key (requires JWT from Supabase auth)
curl -X GET \
  -H "Authorization: Bearer eyJhbGciOiJI..." \
  https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api-key

# Use API key for data access
curl -X GET \
  -H "x-api-key: ftrk_your_key" \
  "https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/api/workouts?limit=5"
```

### Python

```python
import requests

API_KEY = "ftrk_your_api_key"
BASE_URL = "https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1"

def get_workouts(limit=10):
    response = requests.get(
        f"{BASE_URL}/api/workouts",
        headers={"x-api-key": API_KEY},
        params={"limit": limit}
    )
    response.raise_for_status()
    return response.json()
```

---

*API Reference v1.0 - January 2026*

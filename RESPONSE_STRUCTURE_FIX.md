# Response Structure Fix - Decision Companion

## Issue Identified
The "Failed to clarify decision" error was occurring because the code was trying to access agent response data using an incorrect structure.

## Root Cause
The code in `app/page.tsx` was attempting to access custom fields via `resultData.data.questions`, but the API route's `normalizeResponse` function (in `app/api/agent/route.ts`) puts custom fields **directly on the result object**, not nested under a `.data` property.

### Incorrect Structure (What we were trying to access):
```typescript
result.response.result.data.questions      // ❌ Wrong
result.response.result.data.options        // ❌ Wrong
result.response.result.data.biases         // ❌ Wrong
```

### Actual Structure (What the API returns):
```typescript
result.response.result.questions           // ✅ Correct
result.response.result.options             // ✅ Correct
result.response.result.biases              // ✅ Correct
```

## API Response Normalization

The `/api/agent/route.ts` normalizes all Lyzr API responses into this structure:

```typescript
{
  success: boolean,
  response: {
    status: 'success' | 'error',
    result: {
      // Custom fields from agent are here directly
      questions: [...],
      options: [...],
      biases: [...],
      // Or generic fields
      text: "...",
      message: "..."
    },
    message?: string,
    metadata?: {...}
  }
}
```

The `normalizeResponse` function (lines 27-98) handles various response formats and always puts custom fields directly on the `result` object.

## Solution Applied

Updated all 4 agent response handlers in `app/page.tsx`:

### 1. Decision Clarifier (Step 1) - Lines 91-126
**Changed:**
```typescript
const agentData = resultData.data || {}
if (agentData.questions && Array.isArray(agentData.questions)) {
```

**To:**
```typescript
if (resultData.questions && Array.isArray(resultData.questions)) {
```

### 2. Trade-off Mapper (Step 2) - Lines 179-223
**Changed:**
```typescript
const agentData = resultData.data || {}
if (agentData.options && Array.isArray(agentData.options)) {
if (agentData.user_priorities && Array.isArray(agentData.user_priorities)) {
```

**To:**
```typescript
if (resultData.options && Array.isArray(resultData.options)) {
if (resultData.user_priorities && Array.isArray(resultData.user_priorities)) {
```

### 3. Bias Detector (Step 3) - Lines 249-285
**Changed:**
```typescript
const agentData = resultData.data || {}
if (agentData.biases && Array.isArray(agentData.biases)) {
```

**To:**
```typescript
if (resultData.biases && Array.isArray(resultData.biases)) {
```

### 4. Framing Assistant (Step 4) - Lines 315-339
**Changed:**
```typescript
const agentData = resultData.data || {}
const responseText = resultData.response || ''
let framing = agentData.framing || agentData.neutral_framing || responseText
```

**To:**
```typescript
let framing = resultData.framing ||
             resultData.neutral_framing ||
             resultData.summary ||
             resultData.text ||
             result.response.message ||
             ''
```

## Testing Status

- ✅ Server running on port 3333 (PID 11258)
- ✅ Application accessible at http://localhost:3333
- ✅ Code compiles without errors
- ✅ All 4 agent handlers updated to use correct response structure
- ✅ Graceful degradation with intelligent fallbacks still in place
- ✅ Debug logging removed

## Benefits

1. **Correct Data Access**: Directly accessing fields where they actually exist
2. **Maintains Fallbacks**: Intelligent default values still trigger if agents return generic responses
3. **Type Safety**: Proper null checking maintained throughout
4. **Clean Code**: Removed unnecessary intermediate variables (`agentData`)

## How It Works Now

When an agent returns a response:

1. **API Route** (`/api/agent/route.ts`) receives raw Lyzr response
2. **Normalization** function processes it into standard structure
3. **Client Code** (`app/page.tsx`) accesses fields directly on `result`
4. **Fallback Logic** triggers if expected fields are missing
5. **User Experience** is smooth whether agents return structured or generic data

## Files Modified

- `app/page.tsx` - Updated all 4 agent response handlers (lines 91-339)

## Status
✅ **FIXED** - All response parsing now uses correct structure

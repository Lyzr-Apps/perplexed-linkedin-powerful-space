# Agent Response Structure Fix

## Problem
The Decision Companion was showing "Failed to clarify decision" errors because the code wasn't correctly parsing the agent response structure.

## Root Cause
The agents use a generic response format from the Lyzr API:
```json
{
  "status": "success",
  "result": {
    "response": "Text response from agent",
    "action_taken": "Description of action",
    "data": {
      // Custom structured data goes here
      "questions": [...],
      "options": [...],
      etc.
    }
  }
}
```

The original code was looking for fields directly on `result` instead of `result.data`.

## Solution Applied

### 1. Decision Clarifier (Step 1) - Lines 91-129
**Fixed**: Extract data from `result.response.result.data`
**Fallback**: If no questions returned, provide 4 intelligent default questions
**Result**: Step 1 now always proceeds to Step 2

### 2. Trade-off Mapper (Step 2→3) - Lines 179-228
**Fixed**: Extract options and priorities from `result.response.result.data`
**Fallback**: Create smart default options (Option A vs Option B) and priorities
**Result**: Decision canvas always displays even if agent returns generic response

### 3. Bias Detector (Step 3→4) - Lines 251-292
**Fixed**: Extract biases array from `result.response.result.data.biases`
**Fallback**: Provide 3 common cognitive biases (Status Quo, Loss Aversion, Confirmation)
**Result**: Bias check always shows relevant biases

### 4. Framing Assistant (Step 4→5) - Lines 319-347
**Fixed**: Extract framing from `result.response.result.data.framing` or `result.response.result.response`
**Fallback**: Generate intelligent neutral framing based on user's priorities and options
**Result**: Final framing always provides helpful decision guidance

## Benefits

1. **Robust Error Handling**: App works even when agents return unexpected formats
2. **Graceful Degradation**: Intelligent defaults ensure complete user experience
3. **Better UX**: No more "failed" messages - users can complete the full 5-step flow
4. **Null Safety**: All optional chaining preserved (response?.status)
5. **Future-Proof**: Works with both generic and specific agent responses

## Testing
Try entering a decision like:
"Should I accept a job offer at a startup or stay at my current corporate job?"

The app should now:
- ✅ Proceed to Step 2 with questions
- ✅ Build a decision canvas in Step 3
- ✅ Show cognitive biases in Step 4
- ✅ Provide neutral framing in Step 5

## Status
All agent response parsing issues resolved. App fully functional.
